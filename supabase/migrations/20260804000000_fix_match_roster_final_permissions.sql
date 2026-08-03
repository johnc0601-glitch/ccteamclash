-- Finalize live match attendance and roster authorization on launch profiles.

create or replace function private.validate_launch_match_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.match_id is distinct from old.match_id
    or new.team_id is distinct from old.team_id
    or new.player_id is distinct from old.player_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Match attendance identity fields cannot be changed.' using errcode = '23514';
  end if;

  if not private.is_launch_match_team(new.match_id, new.team_id) then
    raise exception 'Attendance team must participate in the match.' using errcode = '23514';
  end if;

  -- Team membership remains a database-integrity invariant. Active status is
  -- enforced by RLS so authenticated inactive-player writes fail with 42501.
  if not exists (
    select 1
    from public.launch_players player
    where player.id = new.player_id
      and player.current_team_id = new.team_id
  ) then
    raise exception 'Attendance player must be active on the selected team.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop policy if exists "authorized users create pre-lock match attendance"
on public.launch_match_attendance;
drop policy if exists "authorized users update pre-lock match attendance"
on public.launch_match_attendance;
drop policy if exists "authorized users delete pre-lock match attendance"
on public.launch_match_attendance;
drop policy if exists "match attendance insert authorized"
on public.launch_match_attendance;
drop policy if exists "match attendance update authorized"
on public.launch_match_attendance;
drop policy if exists "match attendance delete authorized"
on public.launch_match_attendance;

create policy "match attendance insert authorized"
on public.launch_match_attendance
for insert
to authenticated
with check (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_active_player_for_team(player_id, team_id)
  and updated_by = private.current_launch_profile_id()
  and (
    (
      private.is_launch_player(player_id)
      and updated_by = private.current_launch_profile_id()
    )
    or private.is_launch_captain_for_team(team_id)
    or private.is_launch_commissioner()
  )
);

create policy "match attendance update authorized"
on public.launch_match_attendance
for update
to authenticated
using (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and (
    (
      private.is_launch_player(player_id)
      and updated_by = private.current_launch_profile_id()
    )
    or private.is_launch_captain_for_team(team_id)
    or private.is_launch_commissioner()
  )
)
with check (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_active_player_for_team(player_id, team_id)
  and updated_by = private.current_launch_profile_id()
  and (
    private.is_launch_player(player_id)
    or private.is_launch_captain_for_team(team_id)
    or private.is_launch_commissioner()
  )
);

create policy "match attendance delete authorized"
on public.launch_match_attendance
for delete
to authenticated
using (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and (
    (
      private.is_launch_player(player_id)
      and updated_by = private.current_launch_profile_id()
    )
    or private.is_launch_captain_for_team(team_id)
    or private.is_launch_commissioner()
  )
);

drop policy if exists "captains manage pre-lock match rosters"
on public.launch_match_rosters;
drop policy if exists "captains update pre-lock match rosters"
on public.launch_match_rosters;
drop policy if exists "captains and commissioners manage pre-lock match rosters"
on public.launch_match_rosters;
drop policy if exists "captains and commissioners update pre-lock match rosters"
on public.launch_match_rosters;
drop policy if exists "captains commissioners create rosters"
on public.launch_match_rosters;
drop policy if exists "captains commissioners update rosters"
on public.launch_match_rosters;

create policy "captains commissioners create rosters"
on public.launch_match_rosters
for insert
to authenticated
with check (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and (
    private.is_launch_captain_for_team(team_id)
    or private.is_launch_commissioner()
  )
  and (
    (status = 'Draft' and confirmed_by is null and confirmed_at is null)
    or (
      status = 'Confirmed'
      and confirmed_by = private.current_launch_profile_id()
      and confirmed_at is not null
    )
  )
);

create policy "captains commissioners update rosters"
on public.launch_match_rosters
for update
to authenticated
using (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and (
    private.is_launch_captain_for_team(team_id)
    or private.is_launch_commissioner()
  )
)
with check (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and (
    private.is_launch_captain_for_team(team_id)
    or private.is_launch_commissioner()
  )
  and (
    (status = 'Draft' and confirmed_by is null and confirmed_at is null)
    or (
      status = 'Confirmed'
      and confirmed_by = private.current_launch_profile_id()
      and confirmed_at is not null
    )
  )
);
