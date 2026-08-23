create or replace function public.captain_save_unlocked_match_roster(
  target_match_id text,
  target_team_id text,
  changes jsonb
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
  item jsonb;
  target_player_id text;
  target_status text;
  now_at timestamptz := pg_catalog.now();
begin
  select profile.id
  into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role = 'Captain'
    and profile.captain_team_id = target_team_id
  limit 1;

  select match.id, match.season_id, match.home_team_id, match.away_team_id, match.status
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id;

  if actor_profile_id is null
     or target_match.id is null
     or target_match.status = 'Cancelled'
     or target_team_id not in (target_match.home_team_id, target_match.away_team_id)
     or not exists (
       select 1
       from public.launch_match_roster_unlocks unlock
       where unlock.match_id = target_match_id
         and unlock.team_id = target_team_id
         and unlock.relocked_at is null
     )
  then
    raise exception 'Unlocked captain roster save is not available.' using errcode = '42501';
  end if;

  if changes is null or jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 100 then
    raise exception 'Roster changes are invalid.' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(changes)
  loop
    target_player_id := btrim(coalesce(item->>'playerId', ''));
    target_status := coalesce(item->>'status', '');

    if target_player_id = '' or target_status not in ('Playing', 'NotPlaying', 'Unconfirmed') then
      raise exception 'Roster changes are invalid.' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.launch_season_roster_memberships membership
      join public.launch_players player on player.id = membership.player_id and player.active = true
      where membership.season_id = target_match.season_id
        and membership.team_id = target_team_id
        and membership.player_id = target_player_id
        and membership.status = 'Active'
    ) then
      raise exception 'Player is not an active season roster member.' using errcode = '42501';
    end if;

    if target_status = 'Unconfirmed' then
      delete from public.launch_match_attendance attendance
      where attendance.match_id = target_match_id
        and attendance.team_id = target_team_id
        and attendance.player_id = target_player_id;
    else
      insert into public.launch_match_attendance (
        match_id,
        team_id,
        player_id,
        status,
        updated_by
      ) values (
        target_match_id,
        target_team_id,
        target_player_id,
        target_status,
        actor_profile_id
      )
      on conflict (match_id, player_id) do update
        set status = excluded.status,
            updated_by = excluded.updated_by,
            updated_at = now_at
        where public.launch_match_attendance.team_id = target_team_id;
    end if;
  end loop;

  select team.name into trusted_team_name
  from public.launch_teams team
  where team.id = target_team_id;
  if trusted_team_name is null then
    raise exception 'Team not found.' using errcode = '22023';
  end if;

  insert into public.launch_match_rosters (match_id, team_id, status, confirmed_by, confirmed_at)
  values (target_match_id, target_team_id, 'Confirmed', actor_profile_id, now_at)
  on conflict (match_id, team_id) do update
    set status = 'Confirmed',
        confirmed_by = excluded.confirmed_by,
        confirmed_at = excluded.confirmed_at,
        updated_at = now_at;

  delete from public.launch_match_roster_snapshot_players
  where match_id = target_match_id and team_id = target_team_id;

  insert into public.launch_match_roster_snapshot_players (
    match_id,
    team_id,
    team_name_snapshot,
    player_id,
    player_name_snapshot,
    updated_by,
    updated_at
  )
  select
    target_match_id,
    target_team_id,
    trusted_team_name,
    player.id,
    player.name,
    actor_profile_id,
    now_at
  from public.launch_match_attendance attendance
  join public.launch_players player on player.id = attendance.player_id and player.active = true
  join public.launch_season_roster_memberships membership
    on membership.season_id = target_match.season_id
   and membership.team_id = target_team_id
   and membership.player_id = player.id
   and membership.status = 'Active'
  where attendance.match_id = target_match_id
    and attendance.team_id = target_team_id
    and attendance.status = 'Playing';

  update public.launch_match_roster_snapshots
  set team_name_snapshot = trusted_team_name,
      needs_commissioner_review = false,
      updated_by = actor_profile_id,
      updated_at = now_at
  where match_id = target_match_id and team_id = target_team_id;

  if not found then
    raise exception 'Official roster snapshot is not available.' using errcode = '55000';
  end if;

  update public.launch_match_roster_unlocks
  set relocked_at = now_at,
      relocked_by = actor_profile_id
  where match_id = target_match_id
    and team_id = target_team_id
    and relocked_at is null;

  if not found then
    raise exception 'Roster unlock is no longer active.' using errcode = '55000';
  end if;
end;
$$;

grant execute on function public.captain_save_unlocked_match_roster(text, text, jsonb) to authenticated;
