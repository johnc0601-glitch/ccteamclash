create or replace function private.is_launch_player_gender_locked(target_player_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.launch_season_roster_memberships membership
    join public.launch_seasons season on season.id = membership.season_id
    where membership.player_id = target_player_id
      and season.start_date is not null
      and (now() at time zone 'America/New_York')::date >= season.start_date::date
  );
$$;

revoke all on function private.is_launch_player_gender_locked(text) from public, anon;
grant execute on function private.is_launch_player_gender_locked(text) to authenticated, service_role;

create or replace function public.launch_player_gender_locked(target_player_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_launch_player_gender_locked(target_player_id);
$$;

revoke all on function public.launch_player_gender_locked(text) from public, anon;
grant execute on function public.launch_player_gender_locked(text) to authenticated;

create or replace function private.protect_launch_player_league_fields()
returns trigger
language plpgsql
set search_path to 'public', 'private'
as $function$
begin
  if new.gender is distinct from old.gender
     and private.is_launch_player_gender_locked(old.id)
     and not (
       current_setting('app.player_gender_repair_write', true) = 'on'
       and current_user in ('postgres', 'service_role')
     )
  then
    raise exception 'Player gender is permanently locked because a season has started.' using errcode = '23514';
  end if;

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

do $$
begin
  if exists (
    with duplicate_pdga as (
      select btrim(pdga_number) as pdga_number
      from public.launch_players
      where nullif(btrim(pdga_number), '') is not null
      group by btrim(pdga_number)
      having count(*) > 1
    ), evidence as (
      select p.id, btrim(p.pdga_number) as pdga_number,
        (p.active
         or exists (select 1 from public.launch_profiles profile where profile.player_id = p.id)
         or exists (select 1 from public.launch_season_roster_memberships membership where membership.player_id = p.id)
         or exists (select 1 from public.launch_result_contest_players result_player where result_player.player_id = p.id)
         or exists (select 1 from public.historical_player_matchups historical where historical.player_id = p.id)) as has_identity_evidence
      from public.launch_players p
      join duplicate_pdga duplicate on duplicate.pdga_number = btrim(p.pdga_number)
    )
    select 1
    from evidence
    group by pdga_number
    having count(*) filter (where has_identity_evidence) <> 1
  ) then
    raise exception 'Duplicate PDGA identities require manual resolution before the unique PDGA guard can be enabled.';
  end if;
end;
$$;

select set_config('app.captain_registration_write', 'on', true);
with duplicate_pdga as (
  select btrim(pdga_number) as pdga_number
  from public.launch_players
  where nullif(btrim(pdga_number), '') is not null
  group by btrim(pdga_number)
  having count(*) > 1
), evidence as (
  select p.id, btrim(p.pdga_number) as pdga_number,
    (p.active
     or exists (select 1 from public.launch_profiles profile where profile.player_id = p.id)
     or exists (select 1 from public.launch_season_roster_memberships membership where membership.player_id = p.id)
     or exists (select 1 from public.launch_result_contest_players result_player where result_player.player_id = p.id)
     or exists (select 1 from public.historical_player_matchups historical where historical.player_id = p.id)) as has_identity_evidence
  from public.launch_players p
  join duplicate_pdga duplicate on duplicate.pdga_number = btrim(p.pdga_number)
)
update public.launch_players player
set pdga_number = '', updated_at = clock_timestamp()
from evidence
where player.id = evidence.id
  and evidence.has_identity_evidence = false;
select set_config('app.captain_registration_write', 'off', true);

create unique index if not exists launch_players_pdga_number_unique
on public.launch_players (btrim(pdga_number))
where nullif(btrim(pdga_number), '') is not null;

create unique index if not exists launch_profiles_active_player_id_unique
on public.launch_profiles (player_id)
where player_id is not null
  and status not in ('Rejected', 'Suspended');

update public.launch_player_applications application
set gender = player.gender,
    updated_at = clock_timestamp()
from public.launch_profiles profile,
     public.launch_players player,
     public.launch_seasons season
where application.profile_id = profile.id
  and profile.player_id = player.id
  and application.season_id = season.id
  and application.status = 'Approved'
  and season.active = true
  and season.archived = false
  and player.gender in ('Male', 'Female')
  and application.gender is distinct from player.gender;

update public.launch_season_roster_memberships membership
set roster_category = case
      when application.player_type = 'Junior' then 'Junior'
      when player.gender = 'Female' then 'Women'
      else 'Men'
    end,
    updated_at = clock_timestamp()
from public.launch_profiles profile,
     public.launch_players player,
     public.launch_player_applications application,
     public.launch_seasons season
where membership.player_id = player.id
  and membership.season_id = season.id
  and application.profile_id = profile.id
  and profile.player_id = player.id
  and application.season_id = membership.season_id
  and application.status = 'Approved'
  and season.active = true
  and season.archived = false
  and player.gender in ('Male', 'Female')
  and membership.roster_category is distinct from case
      when application.player_type = 'Junior' then 'Junior'
      when player.gender = 'Female' then 'Women'
      else 'Men'
    end;

create or replace function public.submit_launch_player_application(
  target_season_id text,
  target_requested_team_id text,
  target_player_type text,
  target_gender text,
  target_played_before boolean
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
    raise exception 'Finish your one-time Player Setup before registering for a season.' using errcode = '42501';
  end if;

  if target_player_type not in ('Adult', 'Junior') then
    raise exception 'Player type must be Adult or Junior.' using errcode = '23514';
  end if;

  select player.gender into canonical_gender
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

  perform private.require_open_launch_player_application_season(
    target_season_id,
    target_requested_team_id
  );

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
      actor_profile.id, target_season_id, target_requested_team_id,
      target_player_type, resolved_gender, actor_profile.played_before
    ) returning id into application_id;
  else
    update public.launch_player_applications
    set requested_team_id = target_requested_team_id,
        player_type = target_player_type,
        gender = resolved_gender,
        played_before = actor_profile.played_before,
        updated_at = registration_timestamp
    where id = existing_application.id
    returning id into application_id;
  end if;

  return application_id;
end;
$$;

create or replace function public.captain_review_launch_player_application(
  target_application_id uuid,
  target_status text,
  target_gender text,
  target_player_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer record;
  application_record public.launch_player_applications%rowtype;
  profile_record public.launch_profiles%rowtype;
  player_record public.launch_players%rowtype;
  review_timestamp timestamptz := clock_timestamp();
  resolved_gender text;
  resolved_player_type text;
  roster_category text;
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

  if target_status not in ('Approved', 'Rejected') then
    raise exception 'Review status must be Approved or Rejected.' using errcode = '23514';
  end if;

  select application.* into application_record
  from public.launch_player_applications application
  where application.id = target_application_id
  for update;

  if application_record.id is null then
    raise exception 'Season registration not found.' using errcode = 'P0002';
  end if;

  if application_record.status <> 'Pending'
     and not (reviewer.role = 'Commissioner' and application_record.status = 'Rejected' and target_status = 'Approved') then
    raise exception 'This season registration is not awaiting review.' using errcode = '23514';
  end if;

  if reviewer.role = 'Captain' and reviewer.captain_team_id is distinct from application_record.requested_team_id then
    raise exception 'Captains may only review registrations for their assigned team.' using errcode = '42501';
  end if;

  select profile.* into profile_record
  from public.launch_profiles profile
  where profile.id = application_record.profile_id
  for update;

  if profile_record.id is null
     or profile_record.status in ('Rejected', 'Suspended')
     or profile_record.player_id is null
     or profile_record.played_before is null then
    raise exception 'Player Setup must be complete before season review.' using errcode = 'P0002';
  end if;

  if target_status = 'Rejected' then
    update public.launch_player_applications
    set status = 'Rejected', reviewed_at = review_timestamp, reviewed_by = reviewer.id, updated_at = review_timestamp
    where id = application_record.id;
    return application_record.id;
  end if;

  select player.* into player_record
  from public.launch_players player
  where player.id = profile_record.player_id
  for update;

  if player_record.id is null then
    raise exception 'Linked player record not found.' using errcode = 'P0002';
  end if;

  resolved_gender := coalesce(nullif(target_gender, ''), application_record.gender);
  resolved_player_type := coalesce(nullif(target_player_type, ''), application_record.player_type, 'Adult');

  if private.is_launch_player_gender_locked(player_record.id) then
    if player_record.gender not in ('Male', 'Female') then
      raise exception 'Locked player gender is missing. Commissioner review is required.' using errcode = '23514';
    end if;
    if resolved_gender is distinct from player_record.gender then
      raise exception 'Player gender is permanently locked because a season has started.' using errcode = '23514';
    end if;
    resolved_gender := player_record.gender;
  end if;

  if resolved_gender not in ('Male', 'Female') then
    raise exception 'Male or Female is required before approval.' using errcode = '23514';
  end if;

  if resolved_player_type not in ('Adult', 'Junior') then
    raise exception 'Player type must be Adult or Junior.' using errcode = '23514';
  end if;

  update public.launch_player_applications
  set gender = resolved_gender,
      player_type = resolved_player_type,
      updated_at = review_timestamp
  where id = application_record.id;

  roster_category := case
    when resolved_player_type = 'Junior' then 'Junior'
    when resolved_gender = 'Female' then 'Women'
    else 'Men'
  end;

  update public.launch_players
  set gender = resolved_gender,
      current_team_id = application_record.requested_team_id,
      active = true,
      updated_at = review_timestamp
  where id = profile_record.player_id;

  insert into public.launch_season_roster_memberships(
    season_id, team_id, player_id, roster_category, status, added_by,
    added_at, created_at, updated_at
  ) values (
    application_record.season_id, application_record.requested_team_id,
    profile_record.player_id, roster_category, 'Active', reviewer.id,
    review_timestamp, review_timestamp, review_timestamp
  )
  on conflict (season_id, player_id) do update
  set team_id = excluded.team_id,
      roster_category = excluded.roster_category,
      status = 'Active',
      added_by = excluded.added_by,
      added_at = excluded.added_at,
      dropped_at = null,
      dropped_by = null,
      updated_at = excluded.updated_at;

  update public.launch_player_applications
  set status = 'Approved', reviewed_at = review_timestamp, reviewed_by = reviewer.id, updated_at = review_timestamp
  where id = application_record.id;

  return application_record.id;
end;
$$;

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

  if private.is_launch_player_gender_locked(target_player_id)
     and target_gender is distinct from player_record.gender then
    raise exception 'Player gender is permanently locked because a season has started.' using errcode = '23514';
  end if;

  if normalized_pdga <> '' and exists (
    select 1 from public.launch_players other
    where other.id <> target_player_id
      and btrim(other.pdga_number) = normalized_pdga
  ) then
    raise exception 'That PDGA number is already linked to another player record.' using errcode = '23505';
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
  target_player public.launch_players%rowtype;
  active_season_id text;
  active_membership public.launch_season_roster_memberships%rowtype;
  derived_played_before boolean;
  application_id uuid;
  resolved_gender text := target_gender;
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

  select player.* into target_player
  from public.launch_players player
  where player.id = target_profile.player_id
  for update;

  if target_player.id is null then
    raise exception 'Linked player record not found.' using errcode = 'P0002';
  end if;

  if private.is_launch_player_gender_locked(target_player.id) then
    if target_player.gender not in ('Male', 'Female') then
      raise exception 'Locked player gender is missing. Commissioner review is required.' using errcode = '23514';
    end if;
    if resolved_gender is distinct from target_player.gender then
      raise exception 'Player gender is permanently locked because a season has started.' using errcode = '23514';
    end if;
    resolved_gender := target_player.gender;
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
  set gender = resolved_gender,
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
        resolved_gender, derived_played_before, 'Approved', ts, ts, ts, commissioner_id
      ) returning id into application_id;
    else
      update public.launch_player_applications
      set requested_team_id = active_membership.team_id,
          player_type = target_player_type,
          gender = resolved_gender,
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
      resolved_gender, derived_played_before, 'Pending', ts, ts
    ) returning id into application_id;
  else
    update public.launch_player_applications
    set requested_team_id = target_requested_team_id,
        player_type = target_player_type,
        gender = resolved_gender,
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
