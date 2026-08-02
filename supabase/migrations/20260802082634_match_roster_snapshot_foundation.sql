create table public.launch_match_roster_snapshots (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.launch_schedule_matches(id) on delete restrict,
  team_id text not null references public.launch_teams(id) on delete restrict,
  needs_commissioner_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_by text null references public.launch_profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);

create table public.launch_match_roster_snapshot_players (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,
  team_id text not null,
  team_name_snapshot text not null check (btrim(team_name_snapshot) <> ''),
  player_id text not null references public.launch_players(id) on delete restrict,
  player_name_snapshot text not null check (btrim(player_name_snapshot) <> ''),
  created_at timestamptz not null default now(),
  updated_by text null references public.launch_profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (match_id, team_id, player_id),
  foreign key (match_id, team_id)
    references public.launch_match_roster_snapshots(match_id, team_id)
    on delete restrict
);

create index launch_match_roster_snapshots_team_id_idx
on public.launch_match_roster_snapshots(team_id);

create index launch_match_roster_snapshots_updated_by_idx
on public.launch_match_roster_snapshots(updated_by)
where updated_by is not null;

create index launch_match_roster_snapshot_players_team_id_idx
on public.launch_match_roster_snapshot_players(team_id);

create index launch_match_roster_snapshot_players_player_id_idx
on public.launch_match_roster_snapshot_players(player_id);

create index launch_match_roster_snapshot_players_updated_by_idx
on public.launch_match_roster_snapshot_players(updated_by)
where updated_by is not null;

create or replace function private.is_launch_match_snapshot_ready_at(
  target_match_id text,
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
    join public.launch_rounds round on round.id = match.round_id
    join public.launch_schedules schedule on schedule.id = round.schedule_id
    where match.id = target_match_id
      and round.published = true
      and schedule.published = true
      and match.status <> 'Cancelled'
      and match.date is not null
      and match.home_team_id is not null
      and match.away_team_id is not null
      and match.home_team_id <> match.away_team_id
      and check_at >= private.launch_match_lock_at(match.date)
  );
$$;

revoke all on function private.is_launch_match_snapshot_ready_at(text, timestamptz)
from public, anon, authenticated, service_role;

create or replace function public.create_launch_match_roster_snapshot(target_match_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_match record;
  existing_manifest_count integer;
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
    needs_commissioner_review,
    updated_by
  )
  select
    target_match_id,
    participating_team.team_id,
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
  ) as participating_team(team_id);

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
    team.name,
    attendance.player_id,
    player.name,
    null
  from public.launch_match_attendance attendance
  join public.launch_teams team on team.id = attendance.team_id
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

alter table public.launch_match_roster_snapshots enable row level security;
alter table public.launch_match_roster_snapshot_players enable row level security;

revoke all on public.launch_match_roster_snapshots from anon, authenticated;
revoke all on public.launch_match_roster_snapshot_players from anon, authenticated;

grant select on public.launch_match_roster_snapshots to anon, authenticated;
grant select on public.launch_match_roster_snapshot_players to anon, authenticated;

create policy "public reads published match roster snapshots"
on public.launch_match_roster_snapshots
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.launch_schedule_matches match
    join public.launch_rounds round on round.id = match.round_id
    join public.launch_schedules schedule on schedule.id = round.schedule_id
    where match.id = launch_match_roster_snapshots.match_id
      and launch_match_roster_snapshots.team_id in (match.home_team_id, match.away_team_id)
      and round.published = true
      and schedule.published = true
  )
);

create policy "public reads published match roster snapshot players"
on public.launch_match_roster_snapshot_players
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.launch_schedule_matches match
    join public.launch_rounds round on round.id = match.round_id
    join public.launch_schedules schedule on schedule.id = round.schedule_id
    where match.id = launch_match_roster_snapshot_players.match_id
      and launch_match_roster_snapshot_players.team_id in (match.home_team_id, match.away_team_id)
      and round.published = true
      and schedule.published = true
  )
);
