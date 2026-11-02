-- Add an existing, unclaimed player record directly to an active season.
-- Existing roster/snapshot integrity and membership audit triggers remain active.
create or replace function public.commissioner_add_unclaimed_player_to_active_season(
  target_player_id text,
  target_team_id text,
  confirmed_gender text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  commissioner_id text;
  active_season_id text;
  player_record public.launch_players%rowtype;
  existing_membership public.launch_season_roster_memberships%rowtype;
  membership_id uuid;
  target_category text;
  ts timestamptz := pg_catalog.clock_timestamp();
begin
  select profile.id into commissioner_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.role = 'Commissioner'
    and profile.status = 'Approved'
  limit 1;

  if commissioner_id is null then
    raise exception 'Approved commissioner access is required.' using errcode = '42501';
  end if;

  select season.id into active_season_id
  from public.launch_seasons season
  where season.active = true
    and season.published = true
    and season.archived = false
  order by season.year desc, season.created_at desc
  limit 1;

  if active_season_id is null then
    raise exception 'No active published season is available.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.launch_season_teams season_team
    where season_team.season_id = active_season_id
      and season_team.team_id = target_team_id
  ) then
    raise exception 'That team is not enrolled in the active season.' using errcode = '23514';
  end if;

  select player.* into player_record
  from public.launch_players player
  where player.id = target_player_id
  for update;

  if player_record.id is null then
    raise exception 'Player record not found.' using errcode = 'P0002';
  end if;

  if player_record.gender not in ('Male', 'Female') then
    raise exception 'Player division requires commissioner review.' using errcode = '23514';
  end if;

  if confirmed_gender is distinct from player_record.gender then
    raise exception 'Player division has changed; review the record before assigning.' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.launch_profiles profile
    where profile.player_id = player_record.id
  ) then
    raise exception 'This player has a linked account; use the registered-player workflow.' using errcode = '23514';
  end if;

  select membership.* into existing_membership
  from public.launch_season_roster_memberships membership
  where membership.season_id = active_season_id
    and membership.player_id = player_record.id
  for update;

  if existing_membership.id is not null and existing_membership.status = 'Active' then
    if existing_membership.team_id <> target_team_id then
      raise exception 'Player is on another team; use the separate transfer workflow.' using errcode = '23514';
    end if;
    return existing_membership.id;
  end if;

  if player_record.current_team_id is not null then
    raise exception 'Player has an existing team assignment; review before proceeding.' using errcode = '23514';
  end if;

  if existing_membership.id is not null
     and private.is_launch_season_roster_rules_locked(active_season_id, ts) then
    raise exception 'Previously dropped members cannot be reactivated after season roster lock.' using errcode = '42501';
  end if;

  if not player_record.active then
    update public.launch_players
    set active = true, updated_at = ts
    where id = player_record.id;
  end if;

  target_category := case when player_record.gender = 'Female' then 'Women' else 'Men' end;

  if existing_membership.id is not null then
    update public.launch_season_roster_memberships
    set team_id = target_team_id,
        roster_category = target_category,
        status = 'Active',
        added_by = commissioner_id,
        added_at = ts,
        dropped_by = null,
        dropped_at = null,
        updated_at = ts
    where id = existing_membership.id
    returning id into membership_id;
  else
    insert into public.launch_season_roster_memberships (
      season_id, team_id, player_id, roster_category, status, added_by,
      added_at, created_at, updated_at
    ) values (
      active_season_id, target_team_id, player_record.id, target_category, 'Active',
      commissioner_id, ts, ts, ts
    )
    returning id into membership_id;
  end if;

  -- Keep the directory's current team in sync with the season membership.
  -- The existing membership audit trigger records who made this change.
  update public.launch_players
  set current_team_id = target_team_id,
      updated_at = ts
  where id = player_record.id;

  -- Do not alter match-specific rosters or frozen snapshots.
  return membership_id;
end;
$function$;

revoke all on function public.commissioner_add_unclaimed_player_to_active_season(text, text, text) from public, anon;
grant execute on function public.commissioner_add_unclaimed_player_to_active_season(text, text, text) to authenticated;
