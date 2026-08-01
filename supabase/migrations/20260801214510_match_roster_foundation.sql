create table public.launch_match_attendance (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.launch_schedule_matches(id) on delete restrict,
  team_id text not null references public.launch_teams(id) on delete restrict,
  player_id text not null references public.launch_players(id) on delete restrict,
  status text not null check (status in ('Playing', 'NotPlaying')),
  updated_by text not null references public.launch_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create table public.launch_match_rosters (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.launch_schedule_matches(id) on delete restrict,
  team_id text not null references public.launch_teams(id) on delete restrict,
  status text not null default 'Draft' check (status in ('Draft', 'Confirmed')),
  confirmed_by text null references public.launch_profiles(id) on delete restrict,
  confirmed_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique (match_id, team_id),
  check (
    (status = 'Draft' and confirmed_by is null and confirmed_at is null)
    or
    (status = 'Confirmed' and confirmed_by is not null and confirmed_at is not null)
  )
);

create index launch_match_attendance_team_id_idx
on public.launch_match_attendance(team_id);

create index launch_match_attendance_player_id_idx
on public.launch_match_attendance(player_id);

create index launch_match_attendance_updated_by_idx
on public.launch_match_attendance(updated_by);

create index launch_match_attendance_match_team_status_idx
on public.launch_match_attendance(match_id, team_id, status);

create index launch_match_rosters_team_id_idx
on public.launch_match_rosters(team_id);

create index launch_match_rosters_confirmed_by_idx
on public.launch_match_rosters(confirmed_by);

create or replace function private.current_launch_profile_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
  limit 1;
$$;

create or replace function private.is_launch_player(player_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.status = 'Approved'
      and profile.role = 'Player'
      and profile.player_id = player_id
  );
$$;

create or replace function private.is_launch_match_team(match_id text, team_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.launch_schedule_matches match
    where match.id = match_id
      and team_id in (match.home_team_id, match.away_team_id)
  );
$$;

create or replace function private.is_launch_match_published(match_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.launch_schedule_matches match
    join public.launch_rounds round on round.id = match.round_id
    join public.launch_schedules schedule on schedule.id = round.schedule_id
    where match.id = match_id
      and round.published = true
      and schedule.published = true
  );
$$;

create or replace function private.launch_match_lock_at(match_date date)
returns timestamptz
language sql
immutable
security invoker
set search_path = ''
as $$
  select (match_date + time '15:00') at time zone 'America/New_York';
$$;

create or replace function private.is_launch_match_attendance_open_at(
  match_id text,
  check_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.launch_schedule_matches match
    where match.id = match_id
      and match.status in ('Scheduled', 'Postponed', 'Rain Delay')
      and check_at < private.launch_match_lock_at(match.date)
  );
$$;

create or replace function private.is_launch_match_attendance_open(match_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_launch_match_attendance_open_at(match_id, now());
$$;

create or replace function private.is_launch_active_player_for_team(player_id text, team_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.launch_players player
    where player.id = player_id
      and player.active = true
      and player.current_team_id = team_id
  );
$$;

revoke all on function private.current_launch_profile_id() from public, anon, authenticated;
revoke all on function private.is_launch_player(text) from public, anon, authenticated;
revoke all on function private.is_launch_match_team(text, text) from public, anon, authenticated;
revoke all on function private.is_launch_match_published(text) from public, anon, authenticated;
revoke all on function private.launch_match_lock_at(date) from public, anon, authenticated;
revoke all on function private.is_launch_match_attendance_open_at(text, timestamptz) from public, anon, authenticated;
revoke all on function private.is_launch_match_attendance_open(text) from public, anon, authenticated;
revoke all on function private.is_launch_active_player_for_team(text, text) from public, anon, authenticated;

grant execute on function private.current_launch_profile_id() to authenticated;
grant execute on function private.is_launch_player(text) to authenticated;
grant execute on function private.is_launch_match_team(text, text) to authenticated;
grant execute on function private.is_launch_match_published(text) to authenticated;
grant execute on function private.is_launch_match_attendance_open(text) to authenticated;
grant execute on function private.is_launch_active_player_for_team(text, text) to authenticated;

create or replace function private.validate_launch_match_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.match_id is distinct from old.match_id
    or new.team_id is distinct from old.team_id
    or new.player_id is distinct from old.player_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Match attendance identity fields cannot be changed.' using errcode = '23514';
  end if;

  if not private.is_launch_match_team(new.match_id, new.team_id) then
    raise exception 'Attendance team must participate in the match.' using errcode = '23514';
  end if;

  if not private.is_launch_active_player_for_team(new.player_id, new.team_id) then
    raise exception 'Attendance player must be active on the selected team.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

create or replace function private.validate_launch_match_roster()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.match_id is distinct from old.match_id
    or new.team_id is distinct from old.team_id
  ) then
    raise exception 'Match roster identity fields cannot be changed.' using errcode = '23514';
  end if;

  if not private.is_launch_match_team(new.match_id, new.team_id) then
    raise exception 'Roster team must participate in the match.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

revoke all on function private.validate_launch_match_attendance() from public, anon, authenticated;
revoke all on function private.validate_launch_match_roster() from public, anon, authenticated;

create trigger validate_launch_match_attendance
before insert or update on public.launch_match_attendance
for each row execute function private.validate_launch_match_attendance();

create trigger validate_launch_match_roster
before insert or update on public.launch_match_rosters
for each row execute function private.validate_launch_match_roster();

alter table public.launch_match_attendance enable row level security;
alter table public.launch_match_rosters enable row level security;

revoke all on public.launch_match_attendance from anon, authenticated;
revoke all on public.launch_match_rosters from anon, authenticated;

grant select on public.launch_match_attendance to anon, authenticated;
grant insert (match_id, team_id, player_id, status, updated_by)
  on public.launch_match_attendance to authenticated;
grant update (status, updated_by)
  on public.launch_match_attendance to authenticated;
grant delete on public.launch_match_attendance to authenticated;

grant select on public.launch_match_rosters to anon, authenticated;
grant insert (match_id, team_id, status, confirmed_by, confirmed_at)
  on public.launch_match_rosters to authenticated;
grant update (status, confirmed_by, confirmed_at)
  on public.launch_match_rosters to authenticated;

create policy "public reads published match attendance"
on public.launch_match_attendance
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.launch_schedule_matches match
    join public.launch_rounds round on round.id = match.round_id
    join public.launch_schedules schedule on schedule.id = round.schedule_id
    where match.id = launch_match_attendance.match_id
      and round.published = true
      and schedule.published = true
  )
);

create policy "public reads published match rosters"
on public.launch_match_rosters
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.launch_schedule_matches match
    join public.launch_rounds round on round.id = match.round_id
    join public.launch_schedules schedule on schedule.id = round.schedule_id
    where match.id = launch_match_rosters.match_id
      and round.published = true
      and schedule.published = true
  )
);

create policy "authorized users create pre-lock match attendance"
on public.launch_match_attendance
for insert
to authenticated
with check (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_active_player_for_team(player_id, team_id)
  and updated_by = (select private.current_launch_profile_id())
  and (
    private.is_launch_player(player_id)
    or private.is_launch_captain_for_team(team_id)
  )
);

create policy "authorized users update pre-lock match attendance"
on public.launch_match_attendance
for update
to authenticated
using (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and (
    private.is_launch_player(player_id)
    or private.is_launch_captain_for_team(team_id)
  )
)
with check (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_active_player_for_team(player_id, team_id)
  and updated_by = (select private.current_launch_profile_id())
  and (
    private.is_launch_player(player_id)
    or private.is_launch_captain_for_team(team_id)
  )
);

create policy "authorized users delete pre-lock match attendance"
on public.launch_match_attendance
for delete
to authenticated
using (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and (
    private.is_launch_player(player_id)
    or private.is_launch_captain_for_team(team_id)
  )
);

create policy "captains manage pre-lock match rosters"
on public.launch_match_rosters
for insert
to authenticated
with check (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_captain_for_team(team_id)
  and (
    (status = 'Draft' and confirmed_by is null and confirmed_at is null)
    or
    (
      status = 'Confirmed'
      and confirmed_by = (select private.current_launch_profile_id())
      and confirmed_at is not null
    )
  )
);

create policy "captains update pre-lock match rosters"
on public.launch_match_rosters
for update
to authenticated
using (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and private.is_launch_captain_for_team(team_id)
)
with check (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_captain_for_team(team_id)
  and (
    (status = 'Draft' and confirmed_by is null and confirmed_at is null)
    or
    (
      status = 'Confirmed'
      and confirmed_by = (select private.current_launch_profile_id())
      and confirmed_at is not null
    )
  )
);
