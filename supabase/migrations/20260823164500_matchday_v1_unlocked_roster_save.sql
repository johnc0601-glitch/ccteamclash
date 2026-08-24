create or replace function public.captain_save_unlocked_match_roster(target_match_id text, target_team_id text, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  target_match record;
  trusted_team_name text;
  change_row record;
  change_count integer;
begin
  select profile.id into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role = 'Captain'
    and profile.captain_team_id = target_team_id
  limit 1;

  select match.id, match.season_id, match.home_team_id, match.away_team_id, match.status
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id
  for update;

  if actor_profile_id is null
     or target_match.id is null
     or target_match.status = 'Cancelled'
     or target_team_id not in (target_match.home_team_id, target_match.away_team_id)
     or not exists (
       select 1 from public.launch_match_roster_unlocks u
       where u.match_id = target_match_id and u.team_id = target_team_id and u.relocked_at is null
     )
  then
    raise exception 'Unlocked captain roster save is not available.' using errcode='42501';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 100 then
    raise exception 'Roster changes are invalid.' using errcode='22023';
  end if;

  create temporary table if not exists pg_temp.match_roster_changes (
    player_id text primary key,
    status text not null
  ) on commit drop;
  truncate pg_temp.match_roster_changes;

  insert into pg_temp.match_roster_changes(player_id, status)
  select nullif(btrim(x.player_id), ''), x.status
  from jsonb_to_recordset(p_changes) as x(player_id text, status text);

  select count(*) into change_count from pg_temp.match_roster_changes;
  if change_count <> jsonb_array_length(p_changes)
     or exists (select 1 from pg_temp.match_roster_changes where status not in ('Playing','NotPlaying','Unconfirmed'))
     or exists (
       select 1
       from pg_temp.match_roster_changes c
       left join public.launch_season_roster_memberships m
         on m.season_id = target_match.season_id
        and m.team_id = target_team_id
        and m.player_id = c.player_id
        and m.status = 'Active'
       where m.player_id is null
     )
  then
    raise exception 'One or more roster changes are invalid.' using errcode='22023';
  end if;

  for change_row in select player_id, status from pg_temp.match_roster_changes loop
    if change_row.status = 'Unconfirmed' then
      delete from public.launch_match_attendance
      where match_id = target_match_id and team_id = target_team_id and player_id = change_row.player_id;
    else
      insert into public.launch_match_attendance(match_id, team_id, player_id, status, updated_by)
      values(target_match_id, target_team_id, change_row.player_id, change_row.status, actor_profile_id)
      on conflict (match_id, player_id) do update
        set team_id = excluded.team_id,
            status = excluded.status,
            updated_by = excluded.updated_by,
            updated_at = pg_catalog.now();
    end if;
  end loop;

  select name into trusted_team_name from public.launch_teams where id = target_team_id;
  if trusted_team_name is null then raise exception 'Team not found.' using errcode='22023'; end if;

  insert into public.launch_match_rosters (match_id, team_id, status, confirmed_by, confirmed_at)
  values (target_match_id, target_team_id, 'Confirmed', actor_profile_id, pg_catalog.now())
  on conflict (match_id, team_id) do update
    set status='Confirmed', confirmed_by=excluded.confirmed_by, confirmed_at=excluded.confirmed_at, updated_at=pg_catalog.now();

  delete from public.launch_match_roster_snapshot_players
  where match_id = target_match_id and team_id = target_team_id;

  insert into public.launch_match_roster_snapshot_players (
    match_id, team_id, team_name_snapshot, player_id, player_name_snapshot, updated_by, updated_at
  )
  select target_match_id, target_team_id, trusted_team_name, p.id, p.name, actor_profile_id, pg_catalog.now()
  from public.launch_match_attendance a
  join public.launch_players p on p.id = a.player_id and p.active = true
  join public.launch_season_roster_memberships m
    on m.season_id = target_match.season_id
   and m.team_id = target_team_id
   and m.player_id = p.id
   and m.status = 'Active'
  where a.match_id = target_match_id
    and a.team_id = target_team_id
    and a.status = 'Playing';

  update public.launch_match_roster_snapshots
  set team_name_snapshot = trusted_team_name,
      needs_commissioner_review = false,
      updated_by = actor_profile_id,
      updated_at = pg_catalog.now()
  where match_id = target_match_id and team_id = target_team_id;

  if not found then
    raise exception 'Official roster snapshot is not available.' using errcode='55000';
  end if;

  update public.launch_match_roster_unlocks
  set relocked_at = pg_catalog.now(), relocked_by = actor_profile_id
  where match_id = target_match_id and team_id = target_team_id and relocked_at is null;
end;
$$;

grant execute on function public.captain_save_unlocked_match_roster(text,text,jsonb) to authenticated;
