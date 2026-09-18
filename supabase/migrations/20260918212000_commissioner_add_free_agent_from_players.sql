create or replace function public.commissioner_add_launch_free_agent_to_team(
  target_application_id uuid,
  target_team_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer record;
  application_record public.launch_player_applications%rowtype;
  claim_timestamp timestamptz := clock_timestamp();
begin
  select profile.id, profile.role
  into reviewer
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role = 'Commissioner'
  limit 1;

  if reviewer.id is null then
    raise exception 'Approved Commissioner access is required.' using errcode = '42501';
  end if;

  select application.*
  into application_record
  from public.launch_player_applications application
  where application.id = target_application_id
  for update;

  if application_record.id is null then
    raise exception 'Free agent application not found.' using errcode = 'P0002';
  end if;

  if application_record.status <> 'Pending'
     or application_record.requested_team_id is not null then
    raise exception 'This player is no longer available in Free Agency.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.launch_season_teams season_team
    join public.launch_teams team on team.id = season_team.team_id
    join public.launch_seasons season on season.id = season_team.season_id
    where season_team.season_id = application_record.season_id
      and season_team.team_id = target_team_id
      and team.active = true
      and season.active = true
      and season.published = true
      and season.archived = false
  ) then
    raise exception 'That team is not enrolled in the active season.' using errcode = '23514';
  end if;

  update public.launch_player_applications
  set requested_team_id = target_team_id,
      updated_at = claim_timestamp
  where id = application_record.id;

  perform public.captain_review_launch_player_application(target_application_id);

  return target_application_id;
end;
$$;

revoke all on function public.commissioner_add_launch_free_agent_to_team(uuid, text) from public, anon;
grant execute on function public.commissioner_add_launch_free_agent_to_team(uuid, text) to authenticated;
