begin;

create table public.launch_match_round_availability (
  match_id text not null,
  team_id text not null references public.launch_teams(id) on delete restrict,
  player_id text not null references public.launch_players(id) on delete restrict,
  singles_available boolean not null,
  doubles_available boolean not null,
  updated_by text not null references public.launch_profiles(id) on delete restrict,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (match_id, player_id),
  foreign key (match_id, player_id)
    references public.launch_match_attendance(match_id, player_id)
    on delete cascade,
  constraint launch_match_round_availability_sparse_exception
    check (singles_available <> doubles_available)
);

create index launch_match_round_availability_match_team_idx
  on public.launch_match_round_availability(match_id, team_id);

alter table public.launch_match_round_availability enable row level security;
revoke all on table public.launch_match_round_availability from anon, authenticated;
grant select on table public.launch_match_round_availability to authenticated;

create policy "captains and commissioners read round availability"
on public.launch_match_round_availability
for select
to authenticated
using (
  (select private.is_launch_captain_for_team(team_id))
  or (select private.is_launch_commissioner())
);

create or replace function private.validate_launch_match_round_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.match_id is distinct from old.match_id
    or new.team_id is distinct from old.team_id
    or new.player_id is distinct from old.player_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Round availability identity fields cannot be changed.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.launch_match_attendance attendance
    where attendance.match_id = new.match_id
      and attendance.team_id = new.team_id
      and attendance.player_id = new.player_id
      and attendance.status = 'Playing'
  ) then
    raise exception 'Round availability requires Playing attendance for the same team.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := pg_catalog.now();
  end if;
  return new;
end;
$$;

revoke all on function private.validate_launch_match_round_availability() from public, anon, authenticated;

create trigger validate_launch_match_round_availability
before insert or update on public.launch_match_round_availability
for each row execute function private.validate_launch_match_round_availability();

create or replace function private.clear_round_availability_when_not_playing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'Playing' then
    delete from public.launch_match_round_availability availability
    where availability.match_id = new.match_id
      and availability.player_id = new.player_id;
  end if;
  return new;
end;
$$;

revoke all on function private.clear_round_availability_when_not_playing() from public, anon, authenticated;

create trigger clear_round_availability_when_not_playing
after update of status on public.launch_match_attendance
for each row
when (new.status <> 'Playing')
execute function private.clear_round_availability_when_not_playing();

create or replace function public.captain_save_match_roster_availability_batch(
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
  target_match record;
  change_row record;
  change_count integer;
begin
  select profile.id into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and (
      profile.role = 'Commissioner'
      or (profile.role = 'Captain' and profile.captain_team_id = target_team_id)
    )
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
     or not private.is_launch_match_published(target_match_id)
     or not private.is_launch_match_attendance_open(target_match_id)
  then
    raise exception 'Captain roster save is not available.' using errcode = '42501';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 100 then
    raise exception 'Roster changes are invalid.' using errcode = '22023';
  end if;

  create temporary table if not exists pg_temp.match_roster_availability_changes (
    player_id text primary key,
    status text not null,
    singles_available boolean not null,
    doubles_available boolean not null
  ) on commit drop;
  truncate pg_temp.match_roster_availability_changes;

  insert into pg_temp.match_roster_availability_changes(
    player_id, status, singles_available, doubles_available
  )
  select
    nullif(pg_catalog.btrim(change.player_id), ''),
    change.status,
    coalesce(change.singles_available, true),
    coalesce(change.doubles_available, true)
  from jsonb_to_recordset(p_changes) as change(
    player_id text,
    status text,
    singles_available boolean,
    doubles_available boolean
  );

  select count(*) into change_count from pg_temp.match_roster_availability_changes;
  if change_count <> jsonb_array_length(p_changes)
     or exists (
       select 1 from pg_temp.match_roster_availability_changes
       where status not in ('Playing', 'NotPlaying', 'Unconfirmed')
          or (status = 'Playing' and not singles_available and not doubles_available)
          or (status <> 'Playing' and (not singles_available or not doubles_available))
     )
     or exists (
       select 1
       from pg_temp.match_roster_availability_changes change
       left join public.launch_season_roster_memberships membership
         on membership.season_id = target_match.season_id
        and membership.team_id = target_team_id
        and membership.player_id = change.player_id
        and membership.status = 'Active'
       where membership.player_id is null
     )
  then
    raise exception 'One or more roster changes are invalid.' using errcode = '22023';
  end if;

  for change_row in
    select player_id, status, singles_available, doubles_available
    from pg_temp.match_roster_availability_changes
  loop
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
end;
$$;

revoke all on function public.captain_save_match_roster_availability_batch(text, text, jsonb) from public, anon;
grant execute on function public.captain_save_match_roster_availability_batch(text, text, jsonb) to authenticated;

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
     or target_match.status not in ('Scheduled', 'Postponed', 'Rain Delay')
     or target_team_id not in (target_match.home_team_id, target_match.away_team_id)
     or not exists (
       select 1 from public.launch_match_roster_unlocks unlock
       where unlock.match_id = target_match_id
         and unlock.team_id = target_team_id
         and unlock.relocked_at is null
     )
  then
    raise exception 'Unlocked captain roster save is not available.' using errcode = '42501';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 100 then
    raise exception 'Roster changes are invalid.' using errcode = '22023';
  end if;

  create temporary table if not exists pg_temp.match_roster_changes (
    player_id text primary key,
    status text not null,
    singles_available boolean not null,
    doubles_available boolean not null
  ) on commit drop;
  truncate pg_temp.match_roster_changes;

  insert into pg_temp.match_roster_changes(
    player_id, status, singles_available, doubles_available
  )
  select
    nullif(pg_catalog.btrim(change.player_id), ''),
    change.status,
    coalesce(change.singles_available, true),
    coalesce(change.doubles_available, true)
  from jsonb_to_recordset(p_changes) as change(
    player_id text,
    status text,
    singles_available boolean,
    doubles_available boolean
  );

  select count(*) into change_count from pg_temp.match_roster_changes;
  if change_count <> jsonb_array_length(p_changes)
     or exists (
       select 1 from pg_temp.match_roster_changes
       where status not in ('Playing', 'NotPlaying', 'Unconfirmed')
          or (status = 'Playing' and not singles_available and not doubles_available)
          or (status <> 'Playing' and (not singles_available or not doubles_available))
     )
     or exists (
       select 1
       from pg_temp.match_roster_changes change
       left join public.launch_season_roster_memberships membership
         on membership.season_id = target_match.season_id
        and membership.team_id = target_team_id
        and membership.player_id = change.player_id
        and membership.status = 'Active'
       where membership.player_id is null
     )
  then
    raise exception 'One or more roster changes are invalid.' using errcode = '22023';
  end if;

  for change_row in
    select player_id, status, singles_available, doubles_available
    from pg_temp.match_roster_changes
  loop
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

  delete from public.launch_match_roster_snapshot_players
  where match_id = target_match_id and team_id = target_team_id;

  insert into public.launch_match_roster_snapshot_players(
    match_id, team_id, team_name_snapshot, player_id, player_name_snapshot, updated_by, updated_at
  )
  select target_match_id, target_team_id, trusted_team_name,
         player.id, player.name, actor_profile_id, pg_catalog.now()
  from public.launch_match_attendance attendance
  join public.launch_players player
    on player.id = attendance.player_id and player.active = true
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

revoke all on function public.captain_save_unlocked_match_roster(text, text, jsonb) from public, anon;
grant execute on function public.captain_save_unlocked_match_roster(text, text, jsonb) to authenticated;

commit;
