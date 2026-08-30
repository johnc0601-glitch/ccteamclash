-- Fail the migration if mutable roster state still contradicts season membership.

do $assert_roster_integrity$
declare
  active_season_id text;
begin
  if exists (
    select 1
    from public.launch_match_attendance attendance
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
      )
  ) then
    raise exception 'Roster integrity migration left ineligible mutable attendance rows.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.launch_match_rosters roster
    where roster.status = 'Confirmed'
      and not exists (
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
      )
  ) then
    raise exception 'Confirmed mutable roster contains ineligible attendance.' using errcode = '23514';
  end if;

  select season.id
  into active_season_id
  from public.launch_seasons season
  where season.active = true
  order by season.year desc, season.created_at desc
  limit 1;

  if active_season_id is not null and exists (
    select 1
    from public.launch_players player
    left join public.launch_season_roster_memberships membership
      on membership.season_id = active_season_id
     and membership.player_id = player.id
     and membership.status = 'Active'
    where player.current_team_id is distinct from membership.team_id
  ) then
    raise exception 'Current team cache does not match active-season membership.' using errcode = '23514';
  end if;
end;
$assert_roster_integrity$;
