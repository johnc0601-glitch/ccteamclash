create or replace function public.change_launch_player_application_requested_team(
  target_application_id uuid,
  target_requested_team_id text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  application record;
begin
  select candidate.id, candidate.profile_id, candidate.season_id, candidate.status
  into application
  from public.launch_player_applications candidate
  join public.launch_profiles profile on profile.id = candidate.profile_id
  where candidate.id = target_application_id
    and profile.user_id = (select auth.uid())
    and profile.role = 'Player'
    and profile.status = 'Pending'
  for update of candidate;

  if application.id is null then
    raise exception 'Pending player application access is required.' using errcode = '42501';
  end if;

  if application.status <> 'Pending' then
    raise exception 'Only a Pending player application can change requested team.' using errcode = '23514';
  end if;

  if target_requested_team_id is null
    or btrim(target_requested_team_id) = ''
    or not exists (
      select 1
      from public.launch_season_teams season_team
      where season_team.season_id = application.season_id
        and season_team.team_id = target_requested_team_id
    )
  then
    raise exception 'That team is not enrolled in the application season.' using errcode = '23514';
  end if;

  update public.launch_player_applications
  set requested_team_id = target_requested_team_id,
      updated_at = clock_timestamp()
  where id = application.id;

  return application.id;
end;
$$;
