-- Harden match roster authorization
-- Centralizes identity checks and rebuilds attendance/roster policies

create or replace function private.is_current_player(target_player_id text)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.launch_profiles p
    where p.id = private.current_launch_profile_id()
      and p.player_id = target_player_id
      and p.role = 'Player'
      and p.status = 'Approved'
  );
$$;

create or replace function private.is_current_captain_for_team(target_team_id text)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.launch_profiles p
    where p.id = private.current_launch_profile_id()
      and p.captain_team_id = target_team_id
      and p.role = 'Captain'
      and p.status = 'Approved'
  );
$$;

create or replace function private.is_current_commissioner()
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.launch_profiles p
    where p.id = private.current_launch_profile_id()
      and p.role = 'Commissioner'
      and p.status = 'Approved'
  );
$$;

create or replace function private.is_match_editable(target_match_id text)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select private.is_launch_match_attendance_open(target_match_id);
$$;


drop policy if exists "authorized users update pre-lock match attendance"
on public.launch_match_attendance;

drop policy if exists "authorized users delete pre-lock match attendance"
on public.launch_match_attendance;


create policy "match attendance update authorized"
on public.launch_match_attendance
for update
to authenticated
using (
  private.is_match_editable(match_id)
  and (
    private.is_current_player(player_id)
    or private.is_current_captain_for_team(team_id)
    or private.is_current_commissioner()
  )
)
with check (
  private.is_match_editable(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_active_player_for_team(player_id, team_id)
  and updated_by = private.current_launch_profile_id()
);


create policy "match attendance delete authorized"
on public.launch_match_attendance
for delete
to authenticated
using (
  private.is_match_editable(match_id)
  and (
    private.is_current_player(player_id)
    or private.is_current_captain_for_team(team_id)
    or private.is_current_commissioner()
  )
);


drop policy if exists "captains and commissioners manage pre-lock match rosters"
on public.launch_match_rosters;

drop policy if exists "captains and commissioners update pre-lock match rosters"
on public.launch_match_rosters;


create policy "captains commissioners create rosters"
on public.launch_match_rosters
for insert
to authenticated
with check (
  private.is_match_editable(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and (
    private.is_current_captain_for_team(team_id)
    or private.is_current_commissioner()
  )
  and confirmed_by = private.current_launch_profile_id()
);


create policy "captains commissioners update rosters"
on public.launch_match_rosters
for update
to authenticated
using (
  private.is_match_editable(match_id)
  and (
    private.is_current_captain_for_team(team_id)
    or private.is_current_commissioner()
  )
)
with check (
  private.is_launch_match_team(match_id, team_id)
  and confirmed_by = private.current_launch_profile_id()
);