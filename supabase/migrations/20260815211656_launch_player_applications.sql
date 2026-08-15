create table public.launch_player_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.launch_profiles(id) on delete cascade,
  season_id text not null references public.launch_seasons(id) on delete restrict,
  requested_team_id text not null,
  player_type text not null check (player_type in ('Adult', 'Junior')),
  gender text not null check (gender in ('Male', 'Female')),
  played_before boolean not null,
  status text not null default 'Pending'
    check (status in ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by text null references public.launch_profiles(id) on delete restrict,
  unique (profile_id, season_id),
  foreign key (season_id, requested_team_id)
    references public.launch_season_teams(season_id, team_id)
    on delete restrict,
  check (
    (status in ('Pending', 'Cancelled') and reviewed_at is null and reviewed_by is null)
    or
    (status in ('Approved', 'Rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);

create index launch_player_applications_season_team_idx
on public.launch_player_applications(season_id, requested_team_id);

create index launch_player_applications_status_idx
on public.launch_player_applications(status);

create index launch_player_applications_reviewed_by_idx
on public.launch_player_applications(reviewed_by);

alter table public.launch_player_applications enable row level security;

revoke all on public.launch_player_applications from anon, authenticated;
grant select on public.launch_player_applications to authenticated;

create policy "launch applicants read own applications"
on public.launch_player_applications
for select
to authenticated
using (
  exists (
    select 1
    from public.launch_profiles profile
    where profile.id = launch_player_applications.profile_id
      and profile.user_id = (select auth.uid())
  )
);

create policy "launch commissioners read player applications"
on public.launch_player_applications
for select
to authenticated
using (private.is_launch_commissioner());

create function private.require_open_launch_player_application_season(
  target_season_id text,
  target_team_id text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.launch_seasons season
    join public.launch_season_teams season_team
      on season_team.season_id = season.id
     and season_team.team_id = target_team_id
    join public.launch_teams team on team.id = season_team.team_id
    where season.id = target_season_id
      and season.active = true
      and season.published = true
      and season.archived = false
      and season.registration_open = true
      and team.active = true
  ) then
    raise exception 'Player applications require an enrolled team in the open current season.'
      using errcode = '23514';
  end if;
end;
$$;

create function public.submit_launch_player_application(
  target_season_id text,
  target_requested_team_id text,
  target_player_type text,
  target_gender text,
  target_played_before boolean
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  existing_application record;
  application_id uuid;
begin
  select profile.id
  into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.role = 'Player'
    and profile.status = 'Pending'
  limit 1;

  if actor_profile_id is null then
    raise exception 'A Pending Player profile is required to submit an application.'
      using errcode = '42501';
  end if;

  if target_player_type not in ('Adult', 'Junior') then
    raise exception 'Player type must be Adult or Junior.' using errcode = '23514';
  end if;

  if target_gender not in ('Male', 'Female') then
    raise exception 'Gender must be Male or Female.' using errcode = '23514';
  end if;

  perform private.require_open_launch_player_application_season(
    target_season_id,
    target_requested_team_id
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(actor_profile_id || ':' || target_season_id, 0)
  );

  select application.id, application.status
  into existing_application
  from public.launch_player_applications application
  where application.profile_id = actor_profile_id
    and application.season_id = target_season_id
  for update;

  if existing_application.id is not null and existing_application.status <> 'Pending' then
    raise exception 'Only a Pending player application can be changed.' using errcode = '23514';
  end if;

  if existing_application.id is null then
    insert into public.launch_player_applications(
      profile_id,
      season_id,
      requested_team_id,
      player_type,
      gender,
      played_before
    ) values (
      actor_profile_id,
      target_season_id,
      target_requested_team_id,
      target_player_type,
      target_gender,
      target_played_before
    )
    returning id into application_id;
  else
    update public.launch_player_applications
    set requested_team_id = target_requested_team_id,
        player_type = target_player_type,
        gender = target_gender,
        played_before = target_played_before,
        updated_at = clock_timestamp()
    where id = existing_application.id
    returning id into application_id;
  end if;

  return application_id;
end;
$$;

create function public.change_launch_player_application_requested_team(
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

  perform private.require_open_launch_player_application_season(
    application.season_id,
    target_requested_team_id
  );

  update public.launch_player_applications
  set requested_team_id = target_requested_team_id,
      updated_at = clock_timestamp()
  where id = application.id;

  return application.id;
end;
$$;

create function public.cancel_launch_player_application(target_application_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  application_id uuid;
begin
  update public.launch_player_applications application
  set status = 'Cancelled',
      updated_at = clock_timestamp()
  from public.launch_profiles profile
  where application.id = target_application_id
    and profile.id = application.profile_id
    and profile.user_id = (select auth.uid())
    and profile.role = 'Player'
    and profile.status = 'Pending'
    and application.status = 'Pending'
  returning application.id into application_id;

  if application_id is null then
    raise exception 'Only your Pending player application can be cancelled.' using errcode = '42501';
  end if;

  return application_id;
end;
$$;

create function public.review_launch_player_application(
  target_application_id uuid,
  target_status text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  reviewer_profile_id text;
  application_id uuid;
begin
  select profile.id
  into reviewer_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.role = 'Commissioner'
    and profile.status = 'Approved'
  limit 1;

  if reviewer_profile_id is null then
    raise exception 'Approved Commissioner access is required.' using errcode = '42501';
  end if;

  if target_status not in ('Approved', 'Rejected') then
    raise exception 'Application review status must be Approved or Rejected.' using errcode = '23514';
  end if;

  update public.launch_player_applications
  set status = target_status,
      reviewed_at = clock_timestamp(),
      reviewed_by = reviewer_profile_id,
      updated_at = clock_timestamp()
  where id = target_application_id
    and status = 'Pending'
  returning id into application_id;

  if application_id is null then
    raise exception 'Pending player application not found.' using errcode = 'P0002';
  end if;

  return application_id;
end;
$$;

revoke all on function private.require_open_launch_player_application_season(text, text)
from public, anon, authenticated;

revoke all on function public.submit_launch_player_application(text, text, text, text, boolean)
from public, anon, authenticated;
revoke all on function public.change_launch_player_application_requested_team(uuid, text)
from public, anon, authenticated;
revoke all on function public.cancel_launch_player_application(uuid)
from public, anon, authenticated;
revoke all on function public.review_launch_player_application(uuid, text)
from public, anon, authenticated;

grant execute on function public.submit_launch_player_application(text, text, text, text, boolean)
to authenticated;
grant execute on function public.change_launch_player_application_requested_team(uuid, text)
to authenticated;
grant execute on function public.cancel_launch_player_application(uuid)
to authenticated;
grant execute on function public.review_launch_player_application(uuid, text)
to authenticated;
