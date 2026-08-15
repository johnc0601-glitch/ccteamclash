create or replace function private.set_launch_result_player_snapshots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_match_id text;
  expected_team_id text;
  canonical_home_team_id text;
  canonical_away_team_id text;
  completed_manifest_count integer;
begin
  select
    contest.match_id,
    match.home_team_id,
    match.away_team_id,
    case when new.side = 'Home' then match.home_team_id else match.away_team_id end
  into
    target_match_id,
    canonical_home_team_id,
    canonical_away_team_id,
    expected_team_id
  from public.launch_result_contests contest
  join public.launch_schedule_matches match on match.id = contest.match_id
  where contest.id = new.contest_id;

  if target_match_id is null or expected_team_id is null or new.team_id <> expected_team_id then
    raise exception 'Contest player team must match the scheduled % team.', new.side
      using errcode = '23514';
  end if;

  select count(*)
  into completed_manifest_count
  from public.launch_match_roster_snapshots manifest
  where manifest.match_id = target_match_id
    and manifest.team_id in (canonical_home_team_id, canonical_away_team_id);

  if completed_manifest_count <> 2 then
    raise exception 'A complete official match roster is required for player results.'
      using errcode = '23514';
  end if;

  select
    snapshot_player.player_name_snapshot,
    manifest.team_name_snapshot
  into
    new.player_name,
    new.team_name
  from public.launch_match_roster_snapshot_players snapshot_player
  join public.launch_match_roster_snapshots manifest
    on manifest.match_id = snapshot_player.match_id
   and manifest.team_id = snapshot_player.team_id
  where snapshot_player.match_id = target_match_id
    and snapshot_player.team_id = new.team_id
    and snapshot_player.player_id = new.player_id;

  if new.player_name is null or btrim(new.player_name) = ''
    or new.team_name is null or btrim(new.team_name) = '' then
    raise exception 'Contest player must be listed on the official match roster.'
      using errcode = '23514';
  end if;

  new.updated_at = clock_timestamp();
  return new;
end;
$$;

revoke all on function private.set_launch_result_player_snapshots()
from public, anon, authenticated, service_role;
