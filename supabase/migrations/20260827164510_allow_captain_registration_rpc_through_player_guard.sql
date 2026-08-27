create or replace function private.protect_launch_player_league_fields()
returns trigger
language plpgsql
set search_path to 'public', 'private'
as $function$
begin
  if current_setting('app.clash_rating_engine_write', true) = 'on'
     and current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if current_setting('app.captain_registration_write', true) = 'on'
     and current_user in ('postgres', 'service_role')
     and new.id is not distinct from old.id
     and new.clash_index is not distinct from old.clash_index
     and new.clash_index_provisional is not distinct from old.clash_index_provisional
     and new.current_team_id is not distinct from old.current_team_id
     and new.home_area is not distinct from old.home_area
     and new.active is not distinct from old.active
     and new.created_at is not distinct from old.created_at
  then
    return new;
  end if;

  if private.is_launch_commissioner() then
    return new;
  end if;

  if exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.status = 'Approved'
      and profile.role = 'Captain'
      and profile.captain_team_id = new.current_team_id
  )
  and new.id is not distinct from old.id
  and new.name is not distinct from old.name
  and new.pdga_number is not distinct from old.pdga_number
  and new.pdga_rating is not distinct from old.pdga_rating
  and new.clash_index is not distinct from old.clash_index
  and new.clash_index_provisional is not distinct from old.clash_index_provisional
  and new.home_area is not distinct from old.home_area
  and new.created_at is not distinct from old.created_at
  then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.gender is distinct from old.gender
    or new.pdga_number is distinct from old.pdga_number
    or new.pdga_rating is distinct from old.pdga_rating
    or new.clash_index is distinct from old.clash_index
    or new.clash_index_provisional is distinct from old.clash_index_provisional
    or new.current_team_id is distinct from old.current_team_id
    or new.home_area is distinct from old.home_area
    or new.active is distinct from old.active
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Only the linked player name can be changed here.';
  end if;

  return new;
end;
$function$;

create or replace function public.captain_update_rostered_player_registration(
  target_player_id text,
  target_name text,
  target_pdga_number text,
  target_gender text,
  target_is_junior boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer record;
  player_record public.launch_players%rowtype;
  membership_record public.launch_season_roster_memberships%rowtype;
  season_record public.launch_seasons%rowtype;
  edit_timestamp timestamptz := clock_timestamp();
  normalized_name text := btrim(coalesce(target_name, ''));
  normalized_pdga text := btrim(coalesce(target_pdga_number, ''));
  resolved_roster_category text;
begin
  select profile.id, profile.role, profile.captain_team_id
  into reviewer
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role in ('Captain', 'Commissioner')
  limit 1;

  if reviewer.id is null then
    raise exception 'Approved Captain or Commissioner access is required.' using errcode = '42501';
  end if;

  if reviewer.role = 'Captain' and reviewer.captain_team_id is null then
    raise exception 'No captain team is assigned to this account.' using errcode = '42501';
  end if;

  if normalized_name = '' or char_length(normalized_name) > 100 then
    raise exception 'Player name is required and must be 100 characters or fewer.' using errcode = '23514';
  end if;

  if target_gender not in ('Male', 'Female') then
    raise exception 'Gender must be Male or Female.' using errcode = '23514';
  end if;

  if normalized_pdga <> '' and (normalized_pdga !~ '^[0-9]+$' or char_length(normalized_pdga) > 10) then
    raise exception 'PDGA number must contain digits only.' using errcode = '23514';
  end if;

  select player.*
  into player_record
  from public.launch_players player
  where player.id = target_player_id
  for update;

  if player_record.id is null then
    raise exception 'Player not found.' using errcode = 'P0002';
  end if;

  select membership.*
  into membership_record
  from public.launch_season_roster_memberships membership
  join public.launch_seasons season on season.id = membership.season_id
  where membership.player_id = target_player_id
    and membership.status = 'Active'
    and season.active = true
    and season.published = true
    and (reviewer.role = 'Commissioner' or membership.team_id = reviewer.captain_team_id)
  order by season.year desc
  limit 1
  for update of membership;

  if membership_record.id is null then
    raise exception 'Player is not on your active season roster.' using errcode = '42501';
  end if;

  select season.*
  into season_record
  from public.launch_seasons season
  where season.id = membership_record.season_id
  for share;

  if season_record.start_date is null then
    raise exception 'Season start date is not configured.' using errcode = '23514';
  end if;

  if (now() at time zone 'America/New_York')::date >= season_record.start_date::date then
    raise exception 'Player registration editing is locked because the season has started.' using errcode = '42501';
  end if;

  resolved_roster_category := case
    when target_is_junior then 'Junior'
    when target_gender = 'Female' then 'Women'
    else 'Men'
  end;

  perform set_config('app.captain_registration_write', 'on', true);
  update public.launch_players
  set name = normalized_name,
      gender = target_gender,
      pdga_number = normalized_pdga,
      pdga_rating = case
        when coalesce(pdga_number, '') is distinct from normalized_pdga then null
        else pdga_rating
      end,
      updated_at = edit_timestamp
  where id = target_player_id;
  perform set_config('app.captain_registration_write', 'off', true);

  update public.launch_profiles
  set display_name = normalized_name,
      updated_at = edit_timestamp
  where player_id = target_player_id;

  update public.launch_season_roster_memberships
  set roster_category = resolved_roster_category,
      updated_at = edit_timestamp
  where id = membership_record.id;

  update public.launch_player_applications application
  set gender = target_gender,
      player_type = case when target_is_junior then 'Junior' else 'Adult' end,
      updated_at = edit_timestamp
  from public.launch_profiles profile
  where application.profile_id = profile.id
    and profile.player_id = target_player_id
    and application.season_id = membership_record.season_id
    and application.status = 'Approved';

  return target_player_id;
end;
$$;
