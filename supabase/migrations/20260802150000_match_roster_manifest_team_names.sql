alter table public.launch_match_roster_snapshots
add column team_name_snapshot text;

do $$
begin
  if exists (
    select 1
    from public.launch_match_roster_snapshots snapshot
    left join public.launch_teams team on team.id = snapshot.team_id
    where team.id is null or team.name is null or pg_catalog.btrim(team.name) = ''
  ) then
    raise exception 'Every match roster snapshot manifest must reference a named team.' using errcode = '23503';
  end if;
end;
$$;

update public.launch_match_roster_snapshots snapshot
set team_name_snapshot = team.name
from public.launch_teams team
where team.id = snapshot.team_id;

alter table public.launch_match_roster_snapshots
alter column team_name_snapshot set not null;

alter table public.launch_match_roster_snapshots
add constraint launch_match_roster_snapshots_team_name_snapshot_check
check (pg_catalog.btrim(team_name_snapshot) <> '');

create or replace function public.create_launch_match_roster_snapshot(target_match_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_match record;
  existing_manifest_count integer;
  inserted_manifest_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('launch_match_roster_snapshot:' || target_match_id, 0)
  );

  select
    match.id,
    match.home_team_id,
    match.away_team_id
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id;

  if not found
    or not private.is_launch_match_snapshot_ready_at(target_match_id, pg_catalog.now())
  then
    raise exception 'Match snapshot is not available.' using errcode = '22023';
  end if;

  select count(*)::integer
  into existing_manifest_count
  from public.launch_match_roster_snapshots snapshot
  where snapshot.match_id = target_match_id
    and snapshot.team_id in (target_match.home_team_id, target_match.away_team_id);

  if existing_manifest_count = 2 then
    return;
  end if;

  if existing_manifest_count <> 0 then
    raise exception 'Match snapshot manifests are incomplete.' using errcode = '23514';
  end if;

  insert into public.launch_match_roster_snapshots (
    match_id,
    team_id,
    team_name_snapshot,
    needs_commissioner_review,
    updated_by
  )
  select
    target_match_id,
    participating_team.team_id,
    team.name,
    not exists (
      select 1
      from public.launch_match_rosters roster
      where roster.match_id = target_match_id
        and roster.team_id = participating_team.team_id
        and roster.status = 'Confirmed'
    ),
    null
  from (
    values (target_match.away_team_id), (target_match.home_team_id)
  ) as participating_team(team_id)
  join public.launch_teams team on team.id = participating_team.team_id;
  get diagnostics inserted_manifest_count = row_count;

  if inserted_manifest_count <> 2 then
    raise exception 'Match snapshot teams are unavailable.' using errcode = '23503';
  end if;

  insert into public.launch_match_roster_snapshot_players (
    match_id,
    team_id,
    team_name_snapshot,
    player_id,
    player_name_snapshot,
    updated_by
  )
  select
    attendance.match_id,
    attendance.team_id,
    snapshot.team_name_snapshot,
    attendance.player_id,
    player.name,
    null
  from public.launch_match_attendance attendance
  join public.launch_match_roster_snapshots snapshot
    on snapshot.match_id = attendance.match_id
   and snapshot.team_id = attendance.team_id
  join public.launch_players player on player.id = attendance.player_id
  where attendance.match_id = target_match_id
    and attendance.team_id in (target_match.home_team_id, target_match.away_team_id)
    and attendance.status = 'Playing';
end;
$$;

revoke all on function public.create_launch_match_roster_snapshot(text)
from public, anon, authenticated;
grant execute on function public.create_launch_match_roster_snapshot(text)
to service_role;
