create or replace function public.commissioner_assign_player_to_active_season(
  target_player_id text,
  target_team_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  commissioner_id text;
  active_season_id text;
  player_gender text;
  roster_category text;
  membership_id uuid;
  ts timestamptz := clock_timestamp();
begin
  select profile.id into commissioner_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.role = 'Commissioner'
    and profile.status = 'Approved'
  limit 1;

  if commissioner_id is null then
    raise exception 'Approved Commissioner access is required.' using errcode = '42501';
  end if;

  select season.id into active_season_id
  from public.launch_seasons season
  where season.active = true
    and season.published = true
    and season.registration_open = true
    and season.archived = false
  order by season.year desc, season.created_at desc
  limit 1;

  if active_season_id is null then
    raise exception 'No active season is open for registration.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.launch_season_teams season_team
    where season_team.season_id = active_season_id
      and season_team.team_id = target_team_id
  ) then
    raise exception 'That team is not enrolled in the active season.' using errcode = '23514';
  end if;

  select player.gender into player_gender
  from public.launch_players player
  where player.id = target_player_id
    and player.active = true
  for update;

  if player_gender is null then
    raise exception 'Player not found.' using errcode = 'P0002';
  end if;

  if player_gender not in ('Male', 'Female') then
    raise exception 'Choose Male or Female before assigning a team.' using errcode = '23514';
  end if;

  roster_category := case when player_gender = 'Female' then 'Women' else 'Men' end;

  insert into public.launch_season_roster_memberships(
    season_id, team_id, player_id, roster_category, status, added_by,
    added_at, created_at, updated_at
  ) values (
    active_season_id, target_team_id, target_player_id, roster_category, 'Active', commissioner_id,
    ts, ts, ts
  )
  on conflict (season_id, player_id) do update
  set team_id = excluded.team_id,
      roster_category = excluded.roster_category,
      status = 'Active',
      added_by = excluded.added_by,
      added_at = excluded.added_at,
      dropped_by = null,
      dropped_at = null,
      updated_at = excluded.updated_at
  returning id into membership_id;

  update public.launch_players
  set current_team_id = target_team_id,
      updated_at = ts
  where id = target_player_id;

  return membership_id;
end;
$$;

revoke all on function public.commissioner_assign_player_to_active_season(text, text) from public;
grant execute on function public.commissioner_assign_player_to_active_season(text, text) to authenticated;

create or replace function public.commissioner_route_player_to_captain(
  target_profile_id text,
  target_requested_team_id text,
  target_player_type text,
  target_gender text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  commissioner_id text;
  target_profile public.launch_profiles%rowtype;
  active_season_id text;
  active_membership public.launch_season_roster_memberships%rowtype;
  derived_played_before boolean;
  application_id uuid;
  ts timestamptz := clock_timestamp();
begin
  select profile.id into commissioner_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.role = 'Commissioner'
    and profile.status = 'Approved'
  limit 1;

  if commissioner_id is null then
    raise exception 'Approved Commissioner access is required.' using errcode = '42501';
  end if;

  if target_player_type not in ('Adult', 'Junior') then
    raise exception 'Player type must be Adult or Junior.' using errcode = '23514';
  end if;

  if target_gender not in ('Male', 'Female') then
    raise exception 'Player division must be Male or Female.' using errcode = '23514';
  end if;

  select profile.* into target_profile
  from public.launch_profiles profile
  where profile.id = target_profile_id
  for update;

  if target_profile.id is null
     or target_profile.status in ('Rejected', 'Suspended')
     or target_profile.player_id is null then
    raise exception 'An active linked player account is required.' using errcode = 'P0002';
  end if;

  select season.id into active_season_id
  from public.launch_seasons season
  where season.active = true
    and season.published = true
    and season.registration_open = true
    and season.archived = false
  order by season.year desc, season.created_at desc
  limit 1;

  if active_season_id is null then
    raise exception 'No active season is open for registration.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.launch_season_teams season_team
    where season_team.season_id = active_season_id
      and season_team.team_id = target_requested_team_id
  ) then
    raise exception 'That team is not enrolled in the active season.' using errcode = '23514';
  end if;

  select membership.* into active_membership
  from public.launch_season_roster_memberships membership
  where membership.season_id = active_season_id
    and membership.player_id = target_profile.player_id
    and membership.status = 'Active'
  limit 1
  for update;

  derived_played_before := coalesce(
    target_profile.played_before,
    exists (
      select 1 from public.launch_result_contest_players result_player
      where result_player.player_id = target_profile.player_id
    )
    or exists (
      select 1 from public.launch_season_roster_memberships prior_membership
      where prior_membership.player_id = target_profile.player_id
        and prior_membership.season_id <> active_season_id
    )
  );

  update public.launch_profiles
  set status = 'Approved',
      played_before = derived_played_before,
      updated_at = ts
  where id = target_profile.id;

  update public.launch_players
  set gender = target_gender,
      active = true,
      updated_at = ts
  where id = target_profile.player_id;

  select application.id into application_id
  from public.launch_player_applications application
  where application.profile_id = target_profile.id
    and application.season_id = active_season_id
  for update;

  if active_membership.id is not null and target_requested_team_id = active_membership.team_id then
    if application_id is null then
      insert into public.launch_player_applications(
        profile_id, season_id, requested_team_id, player_type, gender, played_before,
        status, created_at, updated_at, reviewed_at, reviewed_by
      ) values (
        target_profile.id, active_season_id, active_membership.team_id, target_player_type,
        target_gender, derived_played_before, 'Approved', ts, ts, ts, commissioner_id
      ) returning id into application_id;
    else
      update public.launch_player_applications
      set requested_team_id = active_membership.team_id,
          player_type = target_player_type,
          gender = target_gender,
          played_before = derived_played_before,
          status = 'Approved',
          reviewed_at = ts,
          reviewed_by = commissioner_id,
          updated_at = ts
      where id = application_id;
    end if;
    return application_id;
  end if;

  if active_membership.id is not null then
    update public.launch_season_roster_memberships
    set status = 'Dropped',
        dropped_by = commissioner_id,
        dropped_at = ts,
        updated_at = ts
    where id = active_membership.id;

    update public.launch_players
    set current_team_id = null,
        updated_at = ts
    where id = target_profile.player_id;
  end if;

  if application_id is null then
    insert into public.launch_player_applications(
      profile_id, season_id, requested_team_id, player_type, gender, played_before,
      status, created_at, updated_at
    ) values (
      target_profile.id, active_season_id, target_requested_team_id, target_player_type,
      target_gender, derived_played_before, 'Pending', ts, ts
    ) returning id into application_id;
  else
    update public.launch_player_applications
    set requested_team_id = target_requested_team_id,
        player_type = target_player_type,
        gender = target_gender,
        played_before = derived_played_before,
        status = 'Pending',
        reviewed_at = null,
        reviewed_by = null,
        updated_at = ts
    where id = application_id;
  end if;

  return application_id;
end;
$$;

revoke all on function public.commissioner_route_player_to_captain(text, text, text, text) from public;
grant execute on function public.commissioner_route_player_to_captain(text, text, text, text) to authenticated;
