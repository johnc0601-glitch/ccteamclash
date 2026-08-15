create or replace function private.is_launch_player_eligible_for_match_team(
  target_match_id text,
  target_player_id text,
  target_team_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_season_id text;
begin
  select match.season_id
  into target_season_id
  from public.launch_schedule_matches match
  where match.id = target_match_id
    and target_team_id in (match.home_team_id, match.away_team_id);

  if target_season_id is null then
    return false;
  end if;

  -- Attendance writes and membership drops take this transaction-scoped lock
  -- before reading or changing eligibility. The stable season/player ordering
  -- prevents a drop and a concurrent attendance write from both succeeding.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'launch-season-roster:' || target_season_id || ':' || target_player_id,
      0
    )
  );

  return exists (
    select 1
    from public.launch_season_roster_memberships membership
    join public.launch_players player on player.id = membership.player_id
    where membership.season_id = target_season_id
      and membership.player_id = target_player_id
      and membership.team_id = target_team_id
      and membership.status = 'Active'
      and player.active = true
  );
end;
$$;

revoke all on function private.is_launch_player_eligible_for_match_team(text, text, text)
from public, anon, authenticated, service_role;
grant execute on function private.is_launch_player_eligible_for_match_team(text, text, text)
to authenticated;

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

  if not private.is_launch_player_eligible_for_match_team(
    new.match_id,
    new.player_id,
    new.team_id
  ) then
    raise exception 'Attendance player is not eligible for the selected match team.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop policy if exists "match attendance insert authorized"
on public.launch_match_attendance;

create policy "match attendance insert authorized"
on public.launch_match_attendance
for insert
to authenticated
with check (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_player_eligible_for_match_team(match_id, player_id, team_id)
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

drop policy if exists "match attendance update authorized"
on public.launch_match_attendance;

create policy "match attendance update authorized"
on public.launch_match_attendance
for update
to authenticated
using (
  private.is_launch_match_published(match_id)
  and private.current_launch_profile_id() is not null
)
with check (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_player_eligible_for_match_team(match_id, player_id, team_id)
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

create or replace function public.drop_launch_season_roster_member(
  target_season_id text,
  target_player_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  membership record;
begin
  select profile.id, profile.role, profile.captain_team_id
  into actor
  from public.launch_profiles profile
  where profile.user_id = auth.uid()
    and profile.status = 'Approved'
  limit 1;

  -- Keep the lock order identical to attendance eligibility checks:
  -- advisory season/player lock, then the membership row lock.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'launch-season-roster:' || target_season_id || ':' || target_player_id,
      0
    )
  );

  select roster.id, roster.team_id, roster.status
  into membership
  from public.launch_season_roster_memberships roster
  where roster.season_id = target_season_id
    and roster.player_id = target_player_id
  for update;

  if membership.id is null then
    raise exception 'Season roster membership not found.' using errcode = 'P0002';
  end if;

  if actor.id is null
    or actor.role not in ('Captain', 'Commissioner')
    or (actor.role = 'Captain' and actor.captain_team_id is distinct from membership.team_id)
  then
    raise exception 'Season roster membership drop is not permitted.' using errcode = '42501';
  end if;

  if membership.status <> 'Active' then
    raise exception 'Season roster membership is already dropped.' using errcode = '23514';
  end if;

  update public.launch_season_roster_memberships
  set status = 'Dropped',
      dropped_by = actor.id,
      dropped_at = clock_timestamp()
  where id = membership.id;

  delete from public.launch_match_attendance attendance
  where attendance.player_id = target_player_id
    and exists (
      select 1
      from public.launch_schedule_matches match
      where match.id = attendance.match_id
        and match.season_id = target_season_id
        and private.is_launch_match_attendance_open(match.id)
    );

  return membership.id;
end;
$$;

revoke all on function public.drop_launch_season_roster_member(text, text)
from public, anon, authenticated, service_role;
grant execute on function public.drop_launch_season_roster_member(text, text)
to authenticated;
