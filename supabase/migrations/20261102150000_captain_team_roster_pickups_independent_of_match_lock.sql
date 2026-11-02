-- Captain additions to the season's team roster are independent of match
-- lineup freezes. Keep team capacity constraints, immutable match snapshots,
-- existing player identities, account checks, and audit triggers unchanged.
--
-- This scoped GUC is only set inside the approved captain SECURITY DEFINER
-- pickup procedure. Authenticated roles have no direct INSERT/UPDATE rights
-- on launch_season_roster_memberships, so callers cannot forge a roster move.
CREATE OR REPLACE FUNCTION private.validate_launch_season_roster_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  rules_locked boolean;
begin
  if tg_op = 'DELETE' then
    raise exception 'Season roster memberships cannot be deleted.' using errcode = '42501';
  end if;

  if new.status = 'Active' and not exists (
    select 1
    from public.launch_players player
    where player.id = new.player_id
      and player.active = true
  ) then
    raise exception 'Season roster player must be active.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.season_id is distinct from old.season_id
      or new.player_id is distinct from old.player_id
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Season roster membership identity fields cannot be changed.' using errcode = '23514';
    end if;

    rules_locked := private.is_launch_season_roster_rules_locked(old.season_id, pg_catalog.clock_timestamp());

    if old.status = 'Dropped' and new.status is distinct from old.status and rules_locked
       and not (
      pg_catalog.current_setting('app.captain_team_roster_write', true) = 'on'
      and current_user in ('postgres', 'service_role')
    ) then
      raise exception 'Dropped season roster members cannot be reactivated after roster lock.' using errcode = '42501';
    end if;

    if (
      new.team_id is distinct from old.team_id
      or new.roster_category is distinct from old.roster_category
      or new.added_by is distinct from old.added_by
      or new.added_at is distinct from old.added_at
    ) and rules_locked and not (
      pg_catalog.current_setting('app.captain_team_roster_write', true) = 'on'
      and current_user in ('postgres', 'service_role')
    ) then
      raise exception 'Season roster membership assignment is locked.' using errcode = '42501';
    end if;

    if new.status = old.status and (
      new.dropped_by is distinct from old.dropped_by
      or new.dropped_at is distinct from old.dropped_at
    ) then
      raise exception 'Season roster membership drop audit fields are database-managed.' using errcode = '42501';
    end if;

    new.updated_at := pg_catalog.clock_timestamp();
  end if;

  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.captain_add_listed_unassigned_player(target_player_id text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  captain_profile public.launch_profiles%rowtype;
  active_season public.launch_seasons%rowtype;
  target_player public.launch_players%rowtype;
  existing_membership public.launch_season_roster_memberships%rowtype;
  pending_application public.launch_player_applications%rowtype;
  resolved_category text;
begin
  select profile.*
  into captain_profile
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role in ('Captain', 'Commissioner')
    and profile.captain_team_id is not null
  limit 1;

  if captain_profile.id is null then
    raise exception 'Approved captain access is required.' using errcode = '42501';
  end if;

  select season.*
  into active_season
  from public.launch_seasons season
  where season.active = true
    and season.published = true
    and season.archived = false
  order by season.start_date desc
  limit 1;

  if active_season.id is null then
    raise exception 'No active season is available.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.launch_season_teams st
    where st.season_id = active_season.id
      and st.team_id = captain_profile.captain_team_id
  ) then
    raise exception 'Your team is not enrolled in the active season.' using errcode = '23514';
  end if;

  -- Team membership pickup is allowed throughout the active season; match
  -- lineups and frozen match snapshots use separate permissions and locks.
  perform pg_catalog.set_config('app.captain_team_roster_write', 'on', true);

  select player.*
  into target_player
  from public.launch_players player
  where player.id = target_player_id
  for update;

  if target_player.id is null or target_player.active is not true then
    raise exception 'Player is not available.' using errcode = 'P0002';
  end if;

  if target_player.current_team_id is not null then
    raise exception 'Player is already assigned to a team.' using errcode = '23514';
  end if;

  select membership.*
  into existing_membership
  from public.launch_season_roster_memberships membership
  where membership.season_id = active_season.id
    and membership.player_id = target_player.id
  limit 1
  for update;

  if existing_membership.id is not null and existing_membership.status = 'Active' then
    raise exception 'Player is already on an active season roster.' using errcode = '23514';
  end if;

  select application.*
  into pending_application
  from public.launch_player_applications application
  join public.launch_profiles profile on profile.id = application.profile_id
  where profile.player_id = target_player.id
    and application.season_id = active_season.id
    and application.status = 'Pending'
  order by application.created_at desc
  limit 1
  for update;

  if pending_application.id is not null then
    if pending_application.requested_team_id is not null
       and pending_application.requested_team_id <> captain_profile.captain_team_id then
      raise exception 'Player has a pending registration with another team.' using errcode = '23514';
    end if;

    if pending_application.requested_team_id is null then
      perform public.captain_claim_launch_free_agent(pending_application.id);
    end if;

    perform public.captain_review_launch_player_application(pending_application.id);
    return target_player.id;
  end if;

  select membership.roster_category
  into resolved_category
  from public.launch_season_roster_memberships membership
  where membership.player_id = target_player.id
  order by membership.created_at desc
  limit 1;

  if resolved_category is null then
    resolved_category := case target_player.gender
      when 'Male' then 'Men'
      when 'Female' then 'Women'
      else null
    end;
  end if;

  if resolved_category is null then
    raise exception 'Player roster category needs commissioner review before they can be added.' using errcode = '23514';
  end if;

  if existing_membership.id is not null then
    update public.launch_season_roster_memberships
    set team_id = captain_profile.captain_team_id,
        roster_category = resolved_category,
        status = 'Active',
        added_by = captain_profile.id,
        added_at = pg_catalog.clock_timestamp(),
        dropped_by = null,
        dropped_at = null
    where id = existing_membership.id;
  else
    insert into public.launch_season_roster_memberships (
      season_id,
      team_id,
      player_id,
      roster_category,
      status,
      added_by
    )
    values (
      active_season.id,
      captain_profile.captain_team_id,
      target_player.id,
      resolved_category,
      'Active',
      captain_profile.id
    );
  end if;

  -- The existing membership reconciliation may leave the public directory's
  -- team field stale. Keep the display in sync after a successful roster add.
  perform pg_catalog.set_config('app.clash_rating_engine_write', 'on', true);
  update public.launch_players
  set current_team_id = captain_profile.captain_team_id,
      updated_at = pg_catalog.clock_timestamp()
  where id = target_player.id
    and current_team_id is distinct from captain_profile.captain_team_id;

  return target_player.id;
end;
$function$

