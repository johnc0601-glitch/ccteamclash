alter table public.launch_player_applications
  alter column requested_team_id drop not null;

create index if not exists launch_player_applications_free_agent_pool_idx
  on public.launch_player_applications (season_id, created_at)
  where status = 'Pending' and requested_team_id is null;

create or replace function public.submit_launch_free_agent_application(
  target_season_id text,
  target_player_type text,
  target_gender text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile public.launch_profiles%rowtype;
  existing_application record;
  application_id uuid;
  registration_timestamp timestamptz := clock_timestamp();
  canonical_gender text;
  resolved_gender text := target_gender;
begin
  select profile.*
  into actor_profile
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.player_id is not null
    and profile.played_before is not null
  limit 1;

  if actor_profile.id is null then
    raise exception 'Finish your one-time Player Setup before joining Free Agency.' using errcode = '42501';
  end if;

  if target_player_type not in ('Adult', 'Junior') then
    raise exception 'Player type must be Adult or Junior.' using errcode = '23514';
  end if;

  select player.gender
  into canonical_gender
  from public.launch_players player
  where player.id = actor_profile.player_id;

  if private.is_launch_player_gender_locked(actor_profile.player_id) then
    if canonical_gender not in ('Male', 'Female') then
      raise exception 'Locked player gender is missing. Commissioner review is required.' using errcode = '23514';
    end if;
    resolved_gender := canonical_gender;
  end if;

  if resolved_gender not in ('Male', 'Female') then
    raise exception 'Gender must be Male or Female.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.launch_seasons season
    where season.id = target_season_id
      and season.active = true
      and season.published = true
      and season.archived = false
      and season.registration_open = true
  ) then
    raise exception 'Free Agency requires the open current season.' using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(actor_profile.id || ':' || target_season_id, 0)
  );

  select application.id, application.status
  into existing_application
  from public.launch_player_applications application
  where application.profile_id = actor_profile.id
    and application.season_id = target_season_id
  for update;

  if existing_application.id is not null and existing_application.status <> 'Pending' then
    raise exception 'This season registration is already finalized.' using errcode = '23514';
  end if;

  if existing_application.id is null then
    insert into public.launch_player_applications(
      profile_id, season_id, requested_team_id, player_type, gender, played_before
    ) values (
      actor_profile.id, target_season_id, null,
      target_player_type, resolved_gender, actor_profile.played_before
    ) returning id into application_id;
  else
    update public.launch_player_applications
    set requested_team_id = null,
        player_type = target_player_type,
        gender = resolved_gender,
        played_before = actor_profile.played_before,
        reviewed_at = null,
        reviewed_by = null,
        updated_at = registration_timestamp
    where id = existing_application.id
    returning id into application_id;
  end if;

  return application_id;
end;
$$;

revoke all on function public.submit_launch_free_agent_application(text, text, text) from public, anon;
grant execute on function public.submit_launch_free_agent_application(text, text, text) to authenticated;

create or replace function public.captain_list_launch_free_agents()
returns table(
  application_id uuid,
  season_id text,
  player_id text,
  display_name text,
  player_name text,
  player_type text,
  gender text,
  pdga_number text,
  pdga_rating integer,
  clash_index integer,
  home_area text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.status = 'Approved'
      and profile.role in ('Captain', 'Commissioner')
  ) then
    raise exception 'Approved Captain or Commissioner access is required.' using errcode = '42501';
  end if;

  return query
  select application.id,
         application.season_id,
         player.id,
         profile.display_name,
         player.name,
         application.player_type,
         application.gender,
         player.pdga_number,
         player.pdga_rating,
         player.clash_index,
         player.home_area,
         application.created_at
  from public.launch_player_applications application
  join public.launch_profiles profile on profile.id = application.profile_id
  join public.launch_players player on player.id = profile.player_id
  join public.launch_seasons season on season.id = application.season_id
  where application.status = 'Pending'
    and application.requested_team_id is null
    and profile.status = 'Approved'
    and season.active = true
    and season.published = true
    and season.archived = false
  order by application.created_at asc, player.name asc;
end;
$$;

revoke all on function public.captain_list_launch_free_agents() from public, anon;
grant execute on function public.captain_list_launch_free_agents() to authenticated;

create or replace function public.captain_claim_launch_free_agent(
  target_application_id uuid
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

  if reviewer.captain_team_id is null then
    raise exception 'No captain team is assigned to this account.' using errcode = '42501';
  end if;

  select application.*
  into application_record
  from public.launch_player_applications application
  where application.id = target_application_id
  for update;

  if application_record.id is null then
    raise exception 'Free agent application not found.' using errcode = 'P0002';
  end if;

  if application_record.status <> 'Pending' or application_record.requested_team_id is not null then
    raise exception 'This player is no longer available in Free Agency.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.launch_season_teams season_team
    join public.launch_teams team on team.id = season_team.team_id
    join public.launch_seasons season on season.id = season_team.season_id
    where season_team.season_id = application_record.season_id
      and season_team.team_id = reviewer.captain_team_id
      and team.active = true
      and season.active = true
      and season.published = true
      and season.archived = false
  ) then
    raise exception 'Your team is not enrolled in this active season.' using errcode = '23514';
  end if;

  update public.launch_player_applications
  set requested_team_id = reviewer.captain_team_id,
      updated_at = claim_timestamp
  where id = application_record.id;

  return application_record.id;
end;
$$;

revoke all on function public.captain_claim_launch_free_agent(uuid) from public, anon;
grant execute on function public.captain_claim_launch_free_agent(uuid) to authenticated;
