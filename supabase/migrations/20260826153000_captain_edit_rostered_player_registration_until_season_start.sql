create or replace function public.captain_update_rostered_player_registration(
  target_player_id uuid,
  target_name text,
  target_pdga_number text,
  target_gender text,
  target_is_junior boolean
)
returns uuid
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

revoke all on function public.captain_update_rostered_player_registration(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.captain_update_rostered_player_registration(uuid, text, text, text, boolean) to authenticated;
