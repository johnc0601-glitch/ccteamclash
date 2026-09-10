-- Keep mutable Matchday state aligned when a scheduled matchup changes teams.
-- Official roster snapshots are deliberately preserved.

-- Repair stale team roster rows first. Attendance deletes can invalidate the
-- corresponding roster confirmation, so the invalid roster row must be gone
-- before stale attendance is removed.
delete from public.launch_match_rosters roster
using public.launch_schedule_matches match
where roster.match_id = match.id
  and roster.team_id is distinct from match.home_team_id
  and roster.team_id is distinct from match.away_team_id
  and not exists (
    select 1
    from public.launch_match_roster_snapshots snapshot
    where snapshot.match_id = roster.match_id
      and snapshot.team_id = roster.team_id
  );

-- Repair any stale mutable attendance left behind by previous matchup edits.
delete from public.launch_match_attendance attendance
using public.launch_schedule_matches match
where attendance.match_id = match.id
  and attendance.team_id is distinct from match.home_team_id
  and attendance.team_id is distinct from match.away_team_id
  and not exists (
    select 1
    from public.launch_match_roster_snapshots snapshot
    where snapshot.match_id = attendance.match_id
      and snapshot.team_id = attendance.team_id
  );

-- Membership changes should only invalidate roster rows for teams that actually
-- participate in the referenced match. This prevents stale rows from blocking
-- captain season-registration approval.
create or replace function private.reconcile_launch_membership_match_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
    update public.launch_match_rosters roster
    set status = 'Draft',
        confirmed_by = null,
        confirmed_at = null,
        updated_at = pg_catalog.now()
    where roster.team_id in (new.team_id, old_team_id)
      and private.is_launch_match_team(roster.match_id, roster.team_id)
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
    perform pg_catalog.set_config('app.clash_rating_engine_write', 'on', true);

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
$$;

-- When teams on a mutable schedule match are edited, immediately remove stale
-- roster/attendance rows for teams no longer in that matchup and invalidate any
-- remaining unsnapshotted roster confirmation.
create or replace function private.reconcile_launch_match_state_after_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.home_team_id is not distinct from old.home_team_id
     and new.away_team_id is not distinct from old.away_team_id then
    return new;
  end if;

  delete from public.launch_match_rosters roster
  where roster.match_id = new.id
    and roster.team_id is distinct from new.home_team_id
    and roster.team_id is distinct from new.away_team_id
    and not exists (
      select 1
      from public.launch_match_roster_snapshots snapshot
      where snapshot.match_id = roster.match_id
        and snapshot.team_id = roster.team_id
    );

  delete from public.launch_match_attendance attendance
  where attendance.match_id = new.id
    and attendance.team_id is distinct from new.home_team_id
    and attendance.team_id is distinct from new.away_team_id
    and not exists (
      select 1
      from public.launch_match_roster_snapshots snapshot
      where snapshot.match_id = attendance.match_id
        and snapshot.team_id = attendance.team_id
    );

  update public.launch_match_rosters roster
  set status = 'Draft',
      confirmed_by = null,
      confirmed_at = null,
      updated_at = pg_catalog.now()
  where roster.match_id = new.id
    and roster.team_id in (new.home_team_id, new.away_team_id)
    and not exists (
      select 1
      from public.launch_match_roster_snapshots snapshot
      where snapshot.match_id = roster.match_id
        and snapshot.team_id = roster.team_id
    );

  return new;
end;
$$;

drop trigger if exists reconcile_launch_match_state_after_schedule_change
on public.launch_schedule_matches;

create trigger reconcile_launch_match_state_after_schedule_change
after update of home_team_id, away_team_id on public.launch_schedule_matches
for each row
execute function private.reconcile_launch_match_state_after_schedule_change();

revoke all on function private.reconcile_launch_match_state_after_schedule_change() from public, anon, authenticated;
