-- Make season roster membership the authority for match attendance and official snapshots.

create or replace function private.validate_launch_match_attendance()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.match_id is distinct from old.match_id
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
    new.updated_at := pg_catalog.now();
  end if;

  return new;
end;
$function$;

create or replace function private.invalidate_launch_match_roster_confirmation()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  affected_match_id text;
  affected_team_id text;
begin
  affected_match_id := case when tg_op = 'DELETE' then old.match_id else new.match_id end;
  affected_team_id := case when tg_op = 'DELETE' then old.team_id else new.team_id end;

  update public.launch_match_rosters roster
  set status = 'Draft',
      confirmed_by = null,
      confirmed_at = null,
      updated_at = pg_catalog.now()
  where roster.match_id = affected_match_id
    and roster.team_id = affected_team_id
    and not exists (
      select 1
      from public.launch_match_roster_snapshots snapshot
      where snapshot.match_id = affected_match_id
        and snapshot.team_id = affected_team_id
    );

  if tg_op = 'UPDATE' and new.team_id is distinct from old.team_id then
    update public.launch_match_rosters roster
    set status = 'Draft',
        confirmed_by = null,
        confirmed_at = null,
        updated_at = pg_catalog.now()
    where roster.match_id = old.match_id
      and roster.team_id = old.team_id
      and not exists (
        select 1
        from public.launch_match_roster_snapshots snapshot
        where snapshot.match_id = old.match_id
          and snapshot.team_id = old.team_id
      );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

drop trigger if exists invalidate_launch_match_roster_confirmation on public.launch_match_attendance;
create trigger invalidate_launch_match_roster_confirmation
after insert or update or delete on public.launch_match_attendance
for each row execute function private.invalidate_launch_match_roster_confirmation();

create or replace function private.reconcile_launch_membership_match_state()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  season_is_active boolean := false;
  old_team_id text;
  membership_changed boolean := false;
begin
  old_team_id := case when tg_op = 'INSERT' then null else old.team_id end;
  membership_changed := tg_op = 'INSERT'
    or new.status is distinct from old.status
    or new.team_id is distinct from old.team_id;

  if membership_changed then
    -- Any add/drop/transfer changes the roster state for both the old and new
    -- teams. Do not mutate already-frozen official snapshots.
    update public.launch_match_rosters roster
    set status = 'Draft',
        confirmed_by = null,
        confirmed_at = null,
        updated_at = pg_catalog.now()
    where roster.team_id in (new.team_id, old_team_id)
      and exists (
        select 1
        from public.launch_schedule_matches match
        where match.id = roster.match_id
          and match.season_id = new.season_id
      )
      and not exists (
        select 1
        from public.launch_match_roster_snapshots snapshot
        where snapshot.match_id = roster.match_id
          and snapshot.team_id = roster.team_id
      );

    -- Availability belongs to a season-team membership. If that membership
    -- changes, old-team availability must not survive into a future freeze.
    if old_team_id is not null then
      delete from public.launch_match_attendance attendance
      where attendance.player_id = new.player_id
        and attendance.team_id = old_team_id
        and exists (
          select 1
          from public.launch_schedule_matches match
          where match.id = attendance.match_id
            and match.season_id = new.season_id
        )
        and not exists (
          select 1
          from public.launch_match_roster_snapshots snapshot
          where snapshot.match_id = attendance.match_id
            and snapshot.team_id = attendance.team_id
        );
    end if;
  end if;

  select coalesce(season.active, false)
  into season_is_active
  from public.launch_seasons season
  where season.id = new.season_id;

  if season_is_active then
    if new.status = 'Active' then
      update public.launch_players player
      set current_team_id = new.team_id,
          updated_at = pg_catalog.now()
      where player.id = new.player_id
        and player.current_team_id is distinct from new.team_id;
    elsif new.status = 'Dropped' then
      update public.launch_players player
      set current_team_id = null,
          updated_at = pg_catalog.now()
      where player.id = new.player_id
        and player.current_team_id is not null
        and not exists (
          select 1
          from public.launch_season_roster_memberships active_membership
          where active_membership.season_id = new.season_id
            and active_membership.player_id = new.player_id
            and active_membership.status = 'Active'
        );
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists reconcile_launch_membership_match_state on public.launch_season_roster_memberships;
create trigger reconcile_launch_membership_match_state
after insert or update on public.launch_season_roster_memberships
for each row execute function private.reconcile_launch_membership_match_state();

create or replace function public.create_launch_match_roster_snapshot(target_match_id text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
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
    match.season_id,
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
    )
    or exists (
      select 1
      from public.launch_match_attendance attendance
      where attendance.match_id = target_match_id
        and attendance.team_id = participating_team.team_id
        and attendance.status = 'Playing'
        and not exists (
          select 1
          from public.launch_season_roster_memberships membership
          join public.launch_players player
            on player.id = membership.player_id
           and player.active = true
          where membership.season_id = target_match.season_id
            and membership.player_id = attendance.player_id
            and membership.team_id = participating_team.team_id
            and membership.status = 'Active'
        )
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
    membership.team_id,
    snapshot.team_name_snapshot,
    attendance.player_id,
    player.name,
    null
  from public.launch_match_attendance attendance
  join public.launch_season_roster_memberships membership
    on membership.season_id = target_match.season_id
   and membership.player_id = attendance.player_id
   and membership.team_id = attendance.team_id
   and membership.status = 'Active'
  join public.launch_players player
    on player.id = membership.player_id
   and player.active = true
  join public.launch_match_roster_snapshots snapshot
    on snapshot.match_id = attendance.match_id
   and snapshot.team_id = membership.team_id
  where attendance.match_id = target_match_id
    and membership.team_id in (target_match.home_team_id, target_match.away_team_id)
    and attendance.status = 'Playing';
end;
$function$;

-- Reconcile pre-existing mutable data. Official snapshots are deliberately untouched.
update public.launch_match_rosters roster
set status = 'Draft',
    confirmed_by = null,
    confirmed_at = null,
    updated_at = pg_catalog.now()
where not exists (
    select 1
    from public.launch_match_roster_snapshots snapshot
    where snapshot.match_id = roster.match_id
      and snapshot.team_id = roster.team_id
  )
  and exists (
    select 1
    from public.launch_match_attendance attendance
    where attendance.match_id = roster.match_id
      and attendance.team_id = roster.team_id
      and not private.is_launch_player_eligible_for_match_team(
        attendance.match_id,
        attendance.player_id,
        attendance.team_id
      )
  );

delete from public.launch_match_attendance attendance
where not exists (
    select 1
    from public.launch_match_roster_snapshots snapshot
    where snapshot.match_id = attendance.match_id
      and snapshot.team_id = attendance.team_id
  )
  and not private.is_launch_player_eligible_for_match_team(
    attendance.match_id,
    attendance.player_id,
    attendance.team_id
  );

-- Keep the legacy current_team_id cache synchronized with the active-season
-- membership so current Stats cannot disagree with Matchday membership.
with active_season as (
  select season.id
  from public.launch_seasons season
  where season.active = true
  order by season.year desc, season.created_at desc
  limit 1
), active_membership as (
  select membership.player_id, membership.team_id
  from public.launch_season_roster_memberships membership
  join active_season season on season.id = membership.season_id
  where membership.status = 'Active'
)
update public.launch_players player
set current_team_id = membership.team_id,
    updated_at = pg_catalog.now()
from active_membership membership
where player.id = membership.player_id
  and player.current_team_id is distinct from membership.team_id;

with active_season as (
  select season.id
  from public.launch_seasons season
  where season.active = true
  order by season.year desc, season.created_at desc
  limit 1
)
update public.launch_players player
set current_team_id = null,
    updated_at = pg_catalog.now()
where player.current_team_id is not null
  and exists (select 1 from active_season)
  and not exists (
    select 1
    from public.launch_season_roster_memberships membership
    join active_season season on season.id = membership.season_id
    where membership.player_id = player.id
      and membership.status = 'Active'
  );
