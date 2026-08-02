create or replace function public.commissioner_add_launch_match_roster_snapshot_player(
  target_match_id text,
  target_team_id text,
  target_player_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  target_match record;
  trusted_team_name text;
  trusted_player_name text;
begin
  select profile.id
  into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role = 'Commissioner'
  limit 1;

  select match.home_team_id, match.away_team_id
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id;

  if actor_profile_id is null
    or not private.is_launch_match_snapshot_ready_at(target_match_id, pg_catalog.now())
    or not private.is_launch_match_team(target_match_id, target_team_id)
    or target_match.home_team_id is null
    or target_match.away_team_id is null
    or not exists (
      select 1
      from public.launch_match_roster_snapshots snapshot
      where snapshot.match_id = target_match_id
        and snapshot.team_id = target_match.home_team_id
    )
    or not exists (
      select 1
      from public.launch_match_roster_snapshots snapshot
      where snapshot.match_id = target_match_id
        and snapshot.team_id = target_match.away_team_id
    )
  then
    raise exception 'Official roster correction is not available.' using errcode = '42501';
  end if;

  select team.name
  into trusted_team_name
  from public.launch_teams team
  where team.id = target_team_id;

  select player.name
  into trusted_player_name
  from public.launch_players player
  where player.id = target_player_id
    and player.active = true;

  if trusted_team_name is null or trusted_player_name is null then
    raise exception 'Team or active player was not found.' using errcode = '22023';
  end if;

  insert into public.launch_match_roster_snapshot_players (
    match_id,
    team_id,
    team_name_snapshot,
    player_id,
    player_name_snapshot,
    updated_by,
    updated_at
  ) values (
    target_match_id,
    target_team_id,
    trusted_team_name,
    target_player_id,
    trusted_player_name,
    actor_profile_id,
    pg_catalog.now()
  );

  update public.launch_match_roster_snapshots
  set updated_by = actor_profile_id,
      updated_at = pg_catalog.now()
  where match_id = target_match_id
    and team_id = target_team_id;
end;
$$;

create or replace function public.commissioner_remove_launch_match_roster_snapshot_player(
  target_match_id text,
  target_team_id text,
  target_player_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  target_match record;
  removed_count integer;
begin
  select profile.id
  into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role = 'Commissioner'
  limit 1;

  select match.home_team_id, match.away_team_id
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id;

  if actor_profile_id is null
    or not private.is_launch_match_snapshot_ready_at(target_match_id, pg_catalog.now())
    or not private.is_launch_match_team(target_match_id, target_team_id)
    or target_match.home_team_id is null
    or target_match.away_team_id is null
    or not exists (
      select 1
      from public.launch_match_roster_snapshots snapshot
      where snapshot.match_id = target_match_id
        and snapshot.team_id = target_match.home_team_id
    )
    or not exists (
      select 1
      from public.launch_match_roster_snapshots snapshot
      where snapshot.match_id = target_match_id
        and snapshot.team_id = target_match.away_team_id
    )
  then
    raise exception 'Official roster correction is not available.' using errcode = '42501';
  end if;

  delete from public.launch_match_roster_snapshot_players snapshot_player
  where snapshot_player.match_id = target_match_id
    and snapshot_player.team_id = target_team_id
    and snapshot_player.player_id = target_player_id;
  get diagnostics removed_count = row_count;

  if removed_count <> 1 then
    raise exception 'Official roster player was not found.' using errcode = '22023';
  end if;

  update public.launch_match_roster_snapshots
  set updated_by = actor_profile_id,
      updated_at = pg_catalog.now()
  where match_id = target_match_id
    and team_id = target_team_id;
end;
$$;

revoke all on function public.commissioner_add_launch_match_roster_snapshot_player(text, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.commissioner_remove_launch_match_roster_snapshot_player(text, text, text)
from public, anon, authenticated, service_role;

grant execute on function public.commissioner_add_launch_match_roster_snapshot_player(text, text, text)
to authenticated;
grant execute on function public.commissioner_remove_launch_match_roster_snapshot_player(text, text, text)
to authenticated;
