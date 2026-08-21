create or replace function public.captain_return_rostered_player_to_commissioner(
  target_player_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  captain_profile public.launch_profiles%rowtype;
  active_season_id text;
  membership public.launch_season_roster_memberships%rowtype;
  application public.launch_player_applications%rowtype;
  ts timestamptz := clock_timestamp();
begin
  select profile.* into captain_profile
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.role in ('Captain', 'Commissioner')
    and profile.status = 'Approved'
  limit 1;

  if captain_profile.id is null or captain_profile.captain_team_id is null then
    raise exception 'Approved captain access is required.' using errcode = '42501';
  end if;

  select season.id into active_season_id
  from public.launch_seasons season
  where season.active = true
    and season.published = true
    and season.archived = false
  order by season.year desc, season.created_at desc
  limit 1;

  if active_season_id is null then
    raise exception 'No active season is available.' using errcode = 'P0002';
  end if;

  select m.* into membership
  from public.launch_season_roster_memberships m
  where m.season_id = active_season_id
    and m.player_id = target_player_id
    and m.team_id = captain_profile.captain_team_id
    and m.status = 'Active'
  limit 1
  for update;

  if membership.id is null then
    raise exception 'That player is not on your active season roster.' using errcode = 'P0002';
  end if;

  select a.* into application
  from public.launch_player_applications a
  join public.launch_profiles p on p.id = a.profile_id
  where a.season_id = active_season_id
    and p.player_id = target_player_id
  limit 1
  for update of a;

  if application.id is null then
    raise exception 'This player does not have a linked season registration. Ask the commissioner to manage this player directly.' using errcode = 'P0002';
  end if;

  update public.launch_season_roster_memberships
  set status = 'Dropped',
      dropped_by = captain_profile.id,
      dropped_at = ts,
      updated_at = ts
  where id = membership.id;

  update public.launch_players
  set current_team_id = null,
      updated_at = ts
  where id = target_player_id;

  update public.launch_player_applications
  set requested_team_id = captain_profile.captain_team_id,
      status = 'Rejected',
      reviewed_by = captain_profile.id,
      reviewed_at = ts,
      updated_at = ts
  where id = application.id;

  return application.id;
end;
$function$;

revoke all on function public.captain_return_rostered_player_to_commissioner(text) from public;
grant execute on function public.captain_return_rostered_player_to_commissioner(text) to authenticated;
