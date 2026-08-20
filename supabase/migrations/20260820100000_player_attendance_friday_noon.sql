-- Players may answer for themselves until Friday noon Eastern.
-- Captains/commissioners retain the existing Friday-midnight-through-match-lock window.

create or replace function private.launch_player_attendance_lock_at(match_date date)
returns timestamptz
language sql
immutable
security invoker
set search_path = ''
as $$
  select (
    match_date
    - (((extract(dow from match_date)::integer - 5 + 7) % 7))
    + time '12:00'
  ) at time zone 'America/New_York';
$$;

create or replace function private.is_launch_player_attendance_open_at(
  match_id text,
  check_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.launch_schedule_matches match
    where match.id = match_id
      and match.status in ('Scheduled', 'Postponed', 'Rain Delay')
      and match.date is not null
      and check_at < private.launch_player_attendance_lock_at(match.date)
  );
$$;

create or replace function private.is_launch_player_attendance_open(match_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_launch_player_attendance_open_at(match_id, now());
$$;

revoke all on function private.launch_player_attendance_lock_at(date)
from public, anon, authenticated, service_role;
revoke all on function private.is_launch_player_attendance_open_at(text, timestamptz)
from public, anon, authenticated, service_role;
revoke all on function private.is_launch_player_attendance_open(text)
from public, anon, authenticated, service_role;
grant execute on function private.is_launch_player_attendance_open(text) to authenticated;

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
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_active_player_for_team(player_id, team_id)
  and updated_by = private.current_launch_profile_id()
  and (
    (
      private.is_launch_player(player_id)
      and private.is_launch_player_attendance_open(match_id)
    )
    or (
      private.is_launch_match_attendance_open(match_id)
      and (
        private.is_launch_captain_for_team(team_id)
        or private.is_launch_commissioner()
      )
    )
  )
);

create policy "match attendance update authorized"
on public.launch_match_attendance
for update
to authenticated
using (
  private.is_launch_match_published(match_id)
  and (
    (
      private.is_launch_player(player_id)
      and private.is_launch_player_attendance_open(match_id)
    )
    or (
      private.is_launch_match_attendance_open(match_id)
      and (
        private.is_launch_captain_for_team(team_id)
        or private.is_launch_commissioner()
      )
    )
  )
)
with check (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_active_player_for_team(player_id, team_id)
  and updated_by = private.current_launch_profile_id()
  and (
    (
      private.is_launch_player(player_id)
      and private.is_launch_player_attendance_open(match_id)
    )
    or (
      private.is_launch_match_attendance_open(match_id)
      and (
        private.is_launch_captain_for_team(team_id)
        or private.is_launch_commissioner()
      )
    )
  )
);

create policy "match attendance delete authorized"
on public.launch_match_attendance
for delete
to authenticated
using (
  private.is_launch_match_published(match_id)
  and (
    (
      private.is_launch_player(player_id)
      and private.is_launch_player_attendance_open(match_id)
    )
    or (
      private.is_launch_match_attendance_open(match_id)
      and (
        private.is_launch_captain_for_team(team_id)
        or private.is_launch_commissioner()
      )
    )
  )
);
