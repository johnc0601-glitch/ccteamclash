create or replace function public.captain_save_unlocked_match_roster(
  target_match_id text,
  target_team_id text,
  p_changes jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  actor_role text;
  target_match record;
  trusted_team_name text;
  change_row record;
  changed_players text[] := array[]::text[];
begin
  select profile.id, profile.role into actor_profile_id, actor_role
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and (profile.role = 'Commissioner'
      or (profile.role = 'Captain' and profile.captain_team_id = target_team_id))
  limit 1;

  select match.id, match.season_id, match.home_team_id, match.away_team_id, match.status
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id
  for update;

  if actor_profile_id is null
     or target_match.id is null
     or target_match.status not in ('Scheduled', 'Postponed', 'Rain Delay')
     or target_team_id not in (target_match.home_team_id, target_match.away_team_id)
  then
    raise exception 'Unlocked roster save is not available.' using errcode = '42501';
  end if;

  perform 1 from public.launch_match_roster_unlocks unlock
  where unlock.match_id = target_match_id
    and unlock.team_id = target_team_id
    and unlock.relocked_at is null
  for update;
  if not found then
    raise exception 'Unlocked roster save is not available.' using errcode = '42501';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 100 then
    raise exception 'Roster changes are invalid.' using errcode = '22023';
  end if;

  for change_row in
    select
      nullif(pg_catalog.btrim(change.player_id), '') as player_id,
      change.status,
      coalesce(change.singles_available, true) as singles_available,
      coalesce(change.doubles_available, true) as doubles_available
    from pg_catalog.jsonb_to_recordset(p_changes) as change(
      player_id text, status text, singles_available boolean, doubles_available boolean
    )
    order by 1
  loop
    if change_row.player_id is null
       or change_row.player_id = any(changed_players)
       or change_row.status is null
       or change_row.status not in ('Playing', 'NotPlaying', 'Unconfirmed')
       or (change_row.status = 'Playing' and not change_row.singles_available and not change_row.doubles_available)
       or (change_row.status <> 'Playing' and (not change_row.singles_available or not change_row.doubles_available))
       or not private.is_launch_player_eligible_for_match_team(
         target_match_id, change_row.player_id, target_team_id
       )
    then
      raise exception 'One or more roster changes are invalid.' using errcode = '22023';
    end if;
    changed_players := pg_catalog.array_append(changed_players, change_row.player_id);

    if change_row.status = 'Unconfirmed' then
      delete from public.launch_match_attendance
      where match_id = target_match_id
        and team_id = target_team_id
        and player_id = change_row.player_id;
    else
      insert into public.launch_match_attendance(match_id, team_id, player_id, status, updated_by)
      values(target_match_id, target_team_id, change_row.player_id, change_row.status, actor_profile_id)
      on conflict (match_id, player_id) do update
        set team_id = excluded.team_id,
            status = excluded.status,
            updated_by = excluded.updated_by,
            updated_at = pg_catalog.now();
    end if;

    if change_row.status = 'Playing'
       and change_row.singles_available <> change_row.doubles_available
    then
      insert into public.launch_match_round_availability(
        match_id, team_id, player_id, singles_available, doubles_available, updated_by
      ) values (
        target_match_id, target_team_id, change_row.player_id,
        change_row.singles_available, change_row.doubles_available, actor_profile_id
      )
      on conflict (match_id, player_id) do update
        set singles_available = excluded.singles_available,
            doubles_available = excluded.doubles_available,
            updated_by = excluded.updated_by,
            updated_at = pg_catalog.now();
    else
      delete from public.launch_match_round_availability
      where match_id = target_match_id
        and team_id = target_team_id
        and player_id = change_row.player_id;
    end if;
  end loop;

  select name into trusted_team_name from public.launch_teams where id = target_team_id;
  if trusted_team_name is null then
    raise exception 'Team not found.' using errcode = '22023';
  end if;

  insert into public.launch_match_rosters(match_id, team_id, status, confirmed_by, confirmed_at)
  values(target_match_id, target_team_id, 'Confirmed', actor_profile_id, pg_catalog.now())
  on conflict (match_id, team_id) do update
    set status = 'Confirmed',
        confirmed_by = excluded.confirmed_by,
        confirmed_at = excluded.confirmed_at,
        updated_at = pg_catalog.now();

  -- Office corrections only alter the players the commissioner selected.
  delete from public.launch_match_roster_snapshot_players
  where match_id = target_match_id and team_id = target_team_id
    and (actor_role = 'Captain' or player_id = any(changed_players));

  insert into public.launch_match_roster_snapshot_players(
    match_id, team_id, team_name_snapshot, player_id, player_name_snapshot, updated_by, updated_at
  )
  select target_match_id, target_team_id, trusted_team_name,
         player.id, player.name, actor_profile_id, pg_catalog.now()
  from public.launch_match_attendance attendance
  join public.launch_players player
    on player.id = attendance.player_id and player.active = true
  where attendance.match_id = target_match_id
    and attendance.team_id = target_team_id
    and attendance.status = 'Playing'
    and (actor_role = 'Captain' or attendance.player_id = any(changed_players));

  update public.launch_match_roster_snapshots
  set team_name_snapshot = trusted_team_name,
      needs_commissioner_review = false,
      updated_by = actor_profile_id,
      updated_at = pg_catalog.now()
  where match_id = target_match_id and team_id = target_team_id;

  if not found then
    raise exception 'Official roster snapshot is not available.' using errcode = '55000';
  end if;

  update public.launch_match_roster_unlocks
  set relocked_at = pg_catalog.now(), relocked_by = actor_profile_id
  where match_id = target_match_id
    and team_id = target_team_id
    and relocked_at is null;
end;
$$;
