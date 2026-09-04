alter table public.launch_player_applications
  add column if not exists submitted_pdga_number text not null default '',
  add column if not exists submitted_pdga_rating integer null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'launch_player_applications_submitted_pdga_rating_check'
      and conrelid = 'public.launch_player_applications'::regclass
  ) then
    alter table public.launch_player_applications
      add constraint launch_player_applications_submitted_pdga_rating_check
      check (submitted_pdga_rating is null or (submitted_pdga_rating >= 1 and submitted_pdga_rating <= 2000));
  end if;
end;
$$;

create index if not exists launch_player_applications_submitted_pdga_idx
  on public.launch_player_applications (btrim(submitted_pdga_number))
  where nullif(btrim(submitted_pdga_number), '') is not null;

create or replace function public.submit_launch_free_agent_application(
  target_season_id text,
  target_player_type text,
  target_gender text,
  target_pdga_number text,
  target_pdga_rating integer
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
  played_before_snapshot boolean;
  normalized_pdga_number text := btrim(coalesce(target_pdga_number, ''));
begin
  select profile.*
  into actor_profile
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status in ('Pending', 'Approved')
  limit 1;

  if actor_profile.id is null then
    raise exception 'A signed-in league account is required to join Free Agency.' using errcode = '42501';
  end if;

  if target_player_type not in ('Adult', 'Junior') then
    raise exception 'Player type must be Adult or Junior.' using errcode = '23514';
  end if;

  if normalized_pdga_number <> ''
     and (normalized_pdga_number !~ '^[0-9]+$' or char_length(normalized_pdga_number) > 10) then
    raise exception 'PDGA number must contain digits only.' using errcode = '23514';
  end if;

  if target_pdga_rating is not null
     and (target_pdga_rating < 1 or target_pdga_rating > 2000) then
    raise exception 'Enter a valid PDGA rating.' using errcode = '23514';
  end if;

  if actor_profile.player_id is not null then
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

  played_before_snapshot := coalesce(actor_profile.played_before, false);

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
      profile_id, season_id, requested_team_id, player_type, gender, played_before,
      submitted_pdga_number, submitted_pdga_rating
    ) values (
      actor_profile.id, target_season_id, null,
      target_player_type, resolved_gender, played_before_snapshot,
      normalized_pdga_number, target_pdga_rating
    ) returning id into application_id;
  else
    update public.launch_player_applications
    set requested_team_id = null,
        player_type = target_player_type,
        gender = resolved_gender,
        played_before = played_before_snapshot,
        submitted_pdga_number = normalized_pdga_number,
        submitted_pdga_rating = target_pdga_rating,
        reviewed_at = null,
        reviewed_by = null,
        updated_at = registration_timestamp
    where id = existing_application.id
    returning id into application_id;
  end if;

  return application_id;
end;
$$;

revoke all on function public.submit_launch_free_agent_application(text, text, text, text, integer) from public, anon;
grant execute on function public.submit_launch_free_agent_application(text, text, text, text, integer) to authenticated;

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
         linked_player.id,
         profile.display_name,
         coalesce(nullif(linked_player.name, ''), nullif(profile.display_name, ''), nullif(pdga_player.name, ''), 'Free Agent'),
         application.player_type,
         application.gender,
         coalesce(
           nullif(linked_player.pdga_number, ''),
           nullif(pdga_player.pdga_number, ''),
           nullif(application.submitted_pdga_number, ''),
           ''
         ),
         coalesce(linked_player.pdga_rating, pdga_player.pdga_rating, application.submitted_pdga_rating),
         coalesce(linked_player.clash_index, pdga_player.clash_index),
         coalesce(nullif(linked_player.home_area, ''), nullif(pdga_player.home_area, ''), ''),
         application.created_at
  from public.launch_player_applications application
  join public.launch_profiles profile on profile.id = application.profile_id
  left join public.launch_players linked_player on linked_player.id = profile.player_id
  left join public.launch_players pdga_player
    on profile.player_id is null
   and nullif(btrim(application.submitted_pdga_number), '') is not null
   and btrim(pdga_player.pdga_number) = btrim(application.submitted_pdga_number)
  join public.launch_seasons season on season.id = application.season_id
  where application.status = 'Pending'
    and application.requested_team_id is null
    and profile.status in ('Pending', 'Approved')
    and season.active = true
    and season.published = true
    and season.archived = false
  order by application.created_at asc,
           coalesce(nullif(linked_player.name, ''), nullif(profile.display_name, ''), nullif(pdga_player.name, ''), 'Free Agent') asc;
end;
$$;

revoke all on function public.captain_list_launch_free_agents() from public, anon;
grant execute on function public.captain_list_launch_free_agents() to authenticated;
