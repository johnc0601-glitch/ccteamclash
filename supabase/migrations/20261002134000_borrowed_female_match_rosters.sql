begin;

create table public.launch_match_roster_loans (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.launch_schedule_matches(id) on delete restrict,
  borrowing_team_id text not null references public.launch_teams(id) on delete restrict,
  player_id text not null references public.launch_players(id) on delete restrict,
  original_team_id text not null references public.launch_teams(id) on delete restrict,
  added_by text not null references public.launch_profiles(id) on delete restrict,
  created_at timestamptz not null default pg_catalog.now(),
  removed_at timestamptz null,
  removed_by text null references public.launch_profiles(id) on delete restrict,
  constraint launch_match_roster_loans_removed_pair
    check (
      (removed_at is null and removed_by is null)
      or (removed_at is not null and removed_by is not null)
    ),
  constraint launch_match_roster_loans_distinct_team
    check (borrowing_team_id <> original_team_id)
);

create unique index launch_match_roster_loans_active_match_player_uidx
  on public.launch_match_roster_loans(match_id, player_id)
  where removed_at is null;

create index launch_match_roster_loans_match_team_idx
  on public.launch_match_roster_loans(match_id, borrowing_team_id)
  where removed_at is null;

create index launch_match_roster_loans_player_idx
  on public.launch_match_roster_loans(player_id)
  where removed_at is null;

create index launch_match_roster_loans_original_team_idx
  on public.launch_match_roster_loans(original_team_id);

create index launch_match_roster_loans_added_by_idx
  on public.launch_match_roster_loans(added_by);

create index launch_match_roster_loans_removed_by_idx
  on public.launch_match_roster_loans(removed_by)
  where removed_by is not null;

alter table public.launch_match_roster_loans enable row level security;
revoke all on table public.launch_match_roster_loans from anon, authenticated;
grant select on table public.launch_match_roster_loans to anon, authenticated;

create policy "public reads active published match roster loans"
on public.launch_match_roster_loans
for select
to anon, authenticated
using (
  removed_at is null
  and exists (
    select 1
    from public.launch_schedule_matches match
    join public.launch_rounds round on round.id = match.round_id
    join public.launch_schedules schedule on schedule.id = round.schedule_id
    where match.id = launch_match_roster_loans.match_id
      and round.published = true
      and schedule.published = true
  )
);

create or replace function private.is_launch_active_match_roster_loan(
  target_match_id text,
  target_player_id text,
  target_team_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.launch_match_roster_loans loan
    where loan.match_id = target_match_id
      and loan.player_id = target_player_id
      and loan.borrowing_team_id = target_team_id
      and loan.removed_at is null
  );
$$;

revoke all on function private.is_launch_active_match_roster_loan(text, text, text)
from public, anon, authenticated;

create or replace function private.is_launch_player_eligible_for_match_team(
  target_match_id text,
  target_player_id text,
  target_team_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_season_id text;
begin
  select match.season_id
  into target_season_id
  from public.launch_schedule_matches match
  where match.id = target_match_id
    and target_team_id in (match.home_team_id, match.away_team_id);

  if target_season_id is null then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'launch-season-roster:' || target_season_id || ':' || target_player_id,
      0
    )
  );

  return exists (
    select 1
    from public.launch_season_roster_memberships membership
    join public.launch_players player on player.id = membership.player_id
    where membership.season_id = target_season_id
      and membership.player_id = target_player_id
      and membership.team_id = target_team_id
      and membership.status = 'Active'
      and player.active = true
  )
  or (
    private.is_launch_active_match_roster_loan(
      target_match_id,
      target_player_id,
      target_team_id
    )
    and exists (
      select 1
      from public.launch_players player
      where player.id = target_player_id
        and player.active = true
        and player.gender = 'Female'
    )
  );
end;
$$;

revoke all on function private.is_launch_player_eligible_for_match_team(text, text, text)
from public, anon, authenticated;
grant execute on function private.is_launch_player_eligible_for_match_team(text, text, text)
to authenticated;

create or replace function private.is_launch_player_committed_elsewhere_on_date(
  target_match_id text,
  target_player_id text,
  target_team_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  with target as (
    select match.date
    from public.launch_schedule_matches match
    where match.id = target_match_id
  )
  select exists (
    select 1
    from public.launch_match_attendance attendance
    join public.launch_schedule_matches match on match.id = attendance.match_id
    join target on target.date = match.date
    where attendance.player_id = target_player_id
      and attendance.status = 'Playing'
      and (
        attendance.match_id <> target_match_id
        or attendance.team_id <> target_team_id
      )
  )
  or exists (
    select 1
    from public.launch_match_roster_loans loan
    join public.launch_schedule_matches match on match.id = loan.match_id
    join target on target.date = match.date
    where loan.player_id = target_player_id
      and loan.removed_at is null
      and (
        loan.match_id <> target_match_id
        or loan.borrowing_team_id <> target_team_id
      )
  );
$;

revoke all on function private.is_launch_player_committed_elsewhere_on_date(text, text, text)
from public, anon, authenticated;

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

  if not private.is_launch_player_eligible_for_match_team(
    new.match_id,
    new.player_id,
    new.team_id
  ) then
    raise exception 'Attendance player is not eligible for the selected match team.' using errcode = '23514';
  end if;

  if new.status = 'Playing'
     and private.is_launch_player_committed_elsewhere_on_date(
       new.match_id,
       new.player_id,
       new.team_id
     )
  then
    raise exception 'Player is already committed to another team on this date.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := pg_catalog.now();
  end if;

  return new;
end;
$$;

revoke all on function private.validate_launch_match_attendance()
from public, anon, authenticated;

create or replace function public.captain_list_borrowable_females(
  target_match_id text,
  target_team_id text
)
returns table (
  player_id text,
  player_name text,
  original_team_id text,
  original_team_name text,
  clash_index integer,
  availability_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  target_match record;
begin
  select profile.id into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and (
      profile.role = 'Commissioner'
      or (profile.role = 'Captain' and profile.captain_team_id = target_team_id)
    )
  limit 1;

  select match.id, match.season_id, match.date, match.home_team_id, match.away_team_id, match.status
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id;

  if actor_profile_id is null
     or target_match.id is null
     or target_match.status not in ('Scheduled', 'Postponed', 'Rain Delay')
     or target_team_id not in (target_match.home_team_id, target_match.away_team_id)
     or not private.is_launch_match_published(target_match_id)
     or not (
       private.is_launch_match_attendance_open(target_match_id)
       or exists (
         select 1
         from public.launch_match_roster_unlocks unlock
         where unlock.match_id = target_match_id
           and unlock.team_id = target_team_id
           and unlock.relocked_at is null
       )
     )
  then
    raise exception 'Borrowed player management is not available.' using errcode = '42501';
  end if;

  return query
  select
    membership.player_id,
    player.name,
    membership.team_id,
    team.name,
    player.clash_index,
    case
      when own_match.id is null then 'No match'
      when own_attendance.status = 'NotPlaying' then 'Not playing'
      when own_attendance.status = 'Playing' then 'Playing'
      else 'Unconfirmed'
    end
  from public.launch_season_roster_memberships membership
  join public.launch_players player
    on player.id = membership.player_id
   and player.active = true
   and player.gender = 'Female'
  join public.launch_teams team on team.id = membership.team_id
  left join lateral (
    select match.id
    from public.launch_schedule_matches match
    where match.date = target_match.date
      and match.id <> target_match_id
      and membership.team_id in (match.home_team_id, match.away_team_id)
      and match.status in ('Scheduled', 'Postponed', 'Rain Delay')
    limit 1
  ) own_match on true
  left join public.launch_match_attendance own_attendance
    on own_attendance.match_id = own_match.id
   and own_attendance.player_id = membership.player_id
  where membership.season_id = target_match.season_id
    and membership.status = 'Active'
    and membership.team_id <> target_team_id
    and membership.team_id <> target_match.home_team_id
    and membership.team_id <> target_match.away_team_id
    and (own_match.id is null or own_attendance.status = 'NotPlaying')
    and not exists (
      select 1
      from public.launch_match_roster_loans loan
      join public.launch_schedule_matches loan_match on loan_match.id = loan.match_id
      where loan.player_id = membership.player_id
        and loan.removed_at is null
        and loan_match.date = target_match.date
    )
    and not exists (
      select 1
      from public.launch_match_attendance attendance
      join public.launch_schedule_matches attendance_match on attendance_match.id = attendance.match_id
      where attendance.player_id = membership.player_id
        and attendance.status = 'Playing'
        and attendance_match.date = target_match.date
    )
  order by team.name, player.name;
end;
$$;

revoke all on function public.captain_list_borrowable_females(text, text)
from public, anon;
grant execute on function public.captain_list_borrowable_females(text, text)
to authenticated;

create or replace function public.captain_borrow_female_for_match(
  target_match_id text,
  target_team_id text,
  target_player_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  target_match record;
  original_team_id text;
begin
  select profile.id into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and (
      profile.role = 'Commissioner'
      or (profile.role = 'Captain' and profile.captain_team_id = target_team_id)
    )
  limit 1;

  select match.id, match.season_id, match.date, match.home_team_id, match.away_team_id, match.status
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id
  for update;

  if actor_profile_id is null
     or target_match.id is null
     or target_match.status not in ('Scheduled', 'Postponed', 'Rain Delay')
     or target_team_id not in (target_match.home_team_id, target_match.away_team_id)
     or not private.is_launch_match_published(target_match_id)
     or not (
       private.is_launch_match_attendance_open(target_match_id)
       or exists (
         select 1
         from public.launch_match_roster_unlocks unlock
         where unlock.match_id = target_match_id
           and unlock.team_id = target_team_id
           and unlock.relocked_at is null
       )
     )
  then
    raise exception 'Borrowed player management is not available.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'launch-season-roster:' || target_match.season_id || ':' || target_player_id,
      0
    )
  );

  select membership.team_id
  into original_team_id
  from public.launch_season_roster_memberships membership
  join public.launch_players player
    on player.id = membership.player_id
   and player.active = true
   and player.gender = 'Female'
  where membership.season_id = target_match.season_id
    and membership.player_id = target_player_id
    and membership.status = 'Active'
  limit 1;

  if original_team_id is null
     or original_team_id = target_team_id
     or original_team_id in (target_match.home_team_id, target_match.away_team_id)
  then
    raise exception 'That player is not eligible to be borrowed for this match.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.launch_match_roster_loans loan
    join public.launch_schedule_matches loan_match on loan_match.id = loan.match_id
    where loan.player_id = target_player_id
      and loan.removed_at is null
      and loan_match.date = target_match.date
  )
  or exists (
    select 1
    from public.launch_match_attendance attendance
    join public.launch_schedule_matches attendance_match on attendance_match.id = attendance.match_id
    where attendance.player_id = target_player_id
      and attendance.status = 'Playing'
      and attendance_match.date = target_match.date
  )
  then
    raise exception 'That player is already committed on this match date.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.launch_schedule_matches own_match
    where own_match.date = target_match.date
      and own_match.id <> target_match_id
      and original_team_id in (own_match.home_team_id, own_match.away_team_id)
      and own_match.status in ('Scheduled', 'Postponed', 'Rain Delay')
      and not exists (
        select 1
        from public.launch_match_attendance own_attendance
        where own_attendance.match_id = own_match.id
          and own_attendance.player_id = target_player_id
          and own_attendance.status = 'NotPlaying'
      )
  )
  then
    raise exception 'That player is not confirmed available on this match date.' using errcode = '23514';
  end if;

  insert into public.launch_match_roster_loans(
    match_id,
    borrowing_team_id,
    player_id,
    original_team_id,
    added_by
  ) values (
    target_match_id,
    target_team_id,
    target_player_id,
    original_team_id,
    actor_profile_id
  );
end;
$$;

revoke all on function public.captain_borrow_female_for_match(text, text, text)
from public, anon;
grant execute on function public.captain_borrow_female_for_match(text, text, text)
to authenticated;

create or replace function public.captain_remove_borrowed_female_from_match(
  target_match_id text,
  target_team_id text,
  target_player_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  target_match record;
  removed_count integer;
begin
  select profile.id into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and (
      profile.role = 'Commissioner'
      or (profile.role = 'Captain' and profile.captain_team_id = target_team_id)
    )
  limit 1;

  select match.id, match.season_id, match.home_team_id, match.away_team_id, match.status
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id
  for update;

  if actor_profile_id is null
     or target_match.id is null
     or target_match.status not in ('Scheduled', 'Postponed', 'Rain Delay')
     or target_team_id not in (target_match.home_team_id, target_match.away_team_id)
     or not private.is_launch_match_published(target_match_id)
     or not (
       private.is_launch_match_attendance_open(target_match_id)
       or exists (
         select 1
         from public.launch_match_roster_unlocks unlock
         where unlock.match_id = target_match_id
           and unlock.team_id = target_team_id
           and unlock.relocked_at is null
       )
     )
  then
    raise exception 'Borrowed player management is not available.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'launch-season-roster:' || target_match.season_id || ':' || target_player_id,
      0
    )
  );

  update public.launch_match_roster_loans
  set removed_at = pg_catalog.now(),
      removed_by = actor_profile_id
  where match_id = target_match_id
    and borrowing_team_id = target_team_id
    and player_id = target_player_id
    and removed_at is null;

  get diagnostics removed_count = row_count;
  if removed_count <> 1 then
    raise exception 'Borrowed player assignment was not found.' using errcode = '22023';
  end if;

  delete from public.launch_match_round_availability
  where match_id = target_match_id
    and team_id = target_team_id
    and player_id = target_player_id;

  delete from public.launch_match_attendance
  where match_id = target_match_id
    and team_id = target_team_id
    and player_id = target_player_id;
end;
$$;

revoke all on function public.captain_remove_borrowed_female_from_match(text, text, text)
from public, anon;
grant execute on function public.captain_remove_borrowed_female_from_match(text, text, text)
to authenticated;

create or replace function public.captain_save_match_roster_availability_batch(
  target_match_id text,
  target_team_id text,
  p_changes jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  target_match record;
  change_row record;
  change_count integer;
begin
  select profile.id into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and (
      profile.role = 'Commissioner'
      or (profile.role = 'Captain' and profile.captain_team_id = target_team_id)
    )
  limit 1;

  select match.id, match.season_id, match.home_team_id, match.away_team_id, match.status
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id
  for update;

  if actor_profile_id is null
     or target_match.id is null
     or target_match.status not in ('Scheduled', 'Postponed', 'Rain Delay')
     or target_team_id not in (target_match.home_team_id, target_match.away_team_id)
     or not private.is_launch_match_published(target_match_id)
     or not private.is_launch_match_attendance_open(target_match_id)
  then
    raise exception 'Captain roster save is not available.' using errcode = '42501';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 100 then
    raise exception 'Roster changes are invalid.' using errcode = '22023';
  end if;

  create temporary table if not exists pg_temp.match_roster_availability_changes (
    player_id text primary key,
    status text not null,
    singles_available boolean not null,
    doubles_available boolean not null
  ) on commit drop;
  truncate pg_temp.match_roster_availability_changes;

  insert into pg_temp.match_roster_availability_changes(
    player_id, status, singles_available, doubles_available
  )
  select
    nullif(pg_catalog.btrim(change.player_id), ''),
    change.status,
    coalesce(change.singles_available, true),
    coalesce(change.doubles_available, true)
  from jsonb_to_recordset(p_changes) as change(
    player_id text,
    status text,
    singles_available boolean,
    doubles_available boolean
  );

  select count(*) into change_count from pg_temp.match_roster_availability_changes;
  if change_count <> jsonb_array_length(p_changes)
     or exists (
       select 1 from pg_temp.match_roster_availability_changes
       where status not in ('Playing', 'NotPlaying', 'Unconfirmed')
          or (status = 'Playing' and not singles_available and not doubles_available)
          or (status <> 'Playing' and (not singles_available or not doubles_available))
     )
     or exists (
       select 1
       from pg_temp.match_roster_availability_changes change
       where not private.is_launch_player_eligible_for_match_team(
         target_match_id,
         change.player_id,
         target_team_id
       )
     )
  then
    raise exception 'One or more roster changes are invalid.' using errcode = '22023';
  end if;

  for change_row in
    select player_id, status, singles_available, doubles_available
    from pg_temp.match_roster_availability_changes
  loop
    if change_row.status = 'Unconfirmed' then
      delete from public.launch_match_attendance
      where match_id = target_match_id
        and team_id = target_team_id
        and player_id = change_row.player_id;
    else
      insert into public.launch_match_attendance(match_id, team_id, player_id, status, updated_by)
      values(target_match_id, target_team_id, change_row.player_id, change_row.status, actor_profile_id)
      on conflict (match_id, player_id) do update
        set team_id = excluded.team_id,
            status = excluded.status,
            updated_by = excluded.updated_by,
            updated_at = pg_catalog.now();
    end if;

    if change_row.status = 'Playing'
       and change_row.singles_available <> change_row.doubles_available
    then
      insert into public.launch_match_round_availability(
        match_id, team_id, player_id, singles_available, doubles_available, updated_by
      ) values (
        target_match_id, target_team_id, change_row.player_id,
        change_row.singles_available, change_row.doubles_available, actor_profile_id
      )
      on conflict (match_id, player_id) do update
        set singles_available = excluded.singles_available,
            doubles_available = excluded.doubles_available,
            updated_by = excluded.updated_by,
            updated_at = pg_catalog.now();
    else
      delete from public.launch_match_round_availability
      where match_id = target_match_id
        and team_id = target_team_id
        and player_id = change_row.player_id;
    end if;
  end loop;
end;
$$;

revoke all on function public.captain_save_match_roster_availability_batch(text, text, jsonb)
from public, anon;
grant execute on function public.captain_save_match_roster_availability_batch(text, text, jsonb)
to authenticated;

create or replace function public.captain_save_unlocked_match_roster(
  target_match_id text,
  target_team_id text,
  p_changes jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id text;
  target_match record;
  trusted_team_name text;
  change_row record;
  change_count integer;
begin
  select profile.id into actor_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role = 'Captain'
    and profile.captain_team_id = target_team_id
  limit 1;

  select match.id, match.season_id, match.home_team_id, match.away_team_id, match.status
  into target_match
  from public.launch_schedule_matches match
  where match.id = target_match_id
  for update;

  if actor_profile_id is null
     or target_match.id is null
     or target_match.status not in ('Scheduled', 'Postponed', 'Rain Delay')
     or target_team_id not in (target_match.home_team_id, target_match.away_team_id)
     or not exists (
       select 1 from public.launch_match_roster_unlocks unlock
       where unlock.match_id = target_match_id
         and unlock.team_id = target_team_id
         and unlock.relocked_at is null
     )
  then
    raise exception 'Unlocked captain roster save is not available.' using errcode = '42501';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 100 then
    raise exception 'Roster changes are invalid.' using errcode = '22023';
  end if;

  create temporary table if not exists pg_temp.match_roster_changes (
    player_id text primary key,
    status text not null,
    singles_available boolean not null,
    doubles_available boolean not null
  ) on commit drop;
  truncate pg_temp.match_roster_changes;

  insert into pg_temp.match_roster_changes(
    player_id, status, singles_available, doubles_available
  )
  select
    nullif(pg_catalog.btrim(change.player_id), ''),
    change.status,
    coalesce(change.singles_available, true),
    coalesce(change.doubles_available, true)
  from jsonb_to_recordset(p_changes) as change(
    player_id text,
    status text,
    singles_available boolean,
    doubles_available boolean
  );

  select count(*) into change_count from pg_temp.match_roster_changes;
  if change_count <> jsonb_array_length(p_changes)
     or exists (
       select 1 from pg_temp.match_roster_changes
       where status not in ('Playing', 'NotPlaying', 'Unconfirmed')
          or (status = 'Playing' and not singles_available and not doubles_available)
          or (status <> 'Playing' and (not singles_available or not doubles_available))
     )
     or exists (
       select 1
       from pg_temp.match_roster_changes change
       where not private.is_launch_player_eligible_for_match_team(
         target_match_id,
         change.player_id,
         target_team_id
       )
     )
  then
    raise exception 'One or more roster changes are invalid.' using errcode = '22023';
  end if;

  for change_row in
    select player_id, status, singles_available, doubles_available
    from pg_temp.match_roster_changes
  loop
    if change_row.status = 'Unconfirmed' then
      delete from public.launch_match_attendance
      where match_id = target_match_id
        and team_id = target_team_id
        and player_id = change_row.player_id;
    else
      insert into public.launch_match_attendance(match_id, team_id, player_id, status, updated_by)
      values(target_match_id, target_team_id, change_row.player_id, change_row.status, actor_profile_id)
      on conflict (match_id, player_id) do update
        set team_id = excluded.team_id,
            status = excluded.status,
            updated_by = excluded.updated_by,
            updated_at = pg_catalog.now();
    end if;

    if change_row.status = 'Playing'
       and change_row.singles_available <> change_row.doubles_available
    then
      insert into public.launch_match_round_availability(
        match_id, team_id, player_id, singles_available, doubles_available, updated_by
      ) values (
        target_match_id, target_team_id, change_row.player_id,
        change_row.singles_available, change_row.doubles_available, actor_profile_id
      )
      on conflict (match_id, player_id) do update
        set singles_available = excluded.singles_available,
            doubles_available = excluded.doubles_available,
            updated_by = excluded.updated_by,
            updated_at = pg_catalog.now();
    else
      delete from public.launch_match_round_availability
      where match_id = target_match_id
        and team_id = target_team_id
        and player_id = change_row.player_id;
    end if;
  end loop;

  select name into trusted_team_name from public.launch_teams where id = target_team_id;
  if trusted_team_name is null then
    raise exception 'Team not found.' using errcode = '22023';
  end if;

  insert into public.launch_match_rosters(match_id, team_id, status, confirmed_by, confirmed_at)
  values(target_match_id, target_team_id, 'Confirmed', actor_profile_id, pg_catalog.now())
  on conflict (match_id, team_id) do update
    set status = 'Confirmed',
        confirmed_by = excluded.confirmed_by,
        confirmed_at = excluded.confirmed_at,
        updated_at = pg_catalog.now();

  delete from public.launch_match_roster_snapshot_players
  where match_id = target_match_id and team_id = target_team_id;

  insert into public.launch_match_roster_snapshot_players(
    match_id, team_id, team_name_snapshot, player_id, player_name_snapshot, updated_by, updated_at
  )
  select target_match_id, target_team_id, trusted_team_name,
         player.id, player.name, actor_profile_id, pg_catalog.now()
  from public.launch_match_attendance attendance
  join public.launch_players player
    on player.id = attendance.player_id and player.active = true
  where attendance.match_id = target_match_id
    and attendance.team_id = target_team_id
    and attendance.status = 'Playing';

  update public.launch_match_roster_snapshots
  set team_name_snapshot = trusted_team_name,
      needs_commissioner_review = false,
      updated_by = actor_profile_id,
      updated_at = pg_catalog.now()
  where match_id = target_match_id and team_id = target_team_id;

  if not found then
    raise exception 'Official roster snapshot is not available.' using errcode = '55000';
  end if;

  update public.launch_match_roster_unlocks
  set relocked_at = pg_catalog.now(), relocked_by = actor_profile_id
  where match_id = target_match_id
    and team_id = target_team_id
    and relocked_at is null;
end;
$$;

revoke all on function public.captain_save_unlocked_match_roster(text, text, jsonb)
from public, anon;
grant execute on function public.captain_save_unlocked_match_roster(text, text, jsonb)
to authenticated;

commit;
