alter table public.launch_seasons
  add column mens_roster_cap integer not null default 25,
  add column womens_roster_cap integer null,
  add column junior_roster_cap integer null,
  add column roster_rules_locked_at timestamptz null;

alter table public.launch_seasons
  add constraint launch_seasons_mens_roster_cap_positive
    check (mens_roster_cap > 0),
  add constraint launch_seasons_womens_roster_cap_positive
    check (womens_roster_cap is null or womens_roster_cap > 0),
  add constraint launch_seasons_junior_roster_cap_positive
    check (junior_roster_cap is null or junior_roster_cap > 0);

create function private.launch_season_roster_rules_lock_at(target_season_id text)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select min((match.date + match.time) at time zone 'America/New_York')
  from public.launch_schedule_matches match
  join public.launch_rounds round
    on round.id = match.round_id
   and round.season_id = match.season_id
  join public.launch_schedules schedule
    on schedule.id = round.schedule_id
   and schedule.season_id = match.season_id
  where match.season_id = target_season_id
    and match.date is not null
    and match.home_team_id is not null
    and match.away_team_id is not null
    and match.status in ('Scheduled', 'Rain Delay', 'Completed')
    and round.published = true
    and schedule.published = true
    and not exists (
      select 1
      from public.launch_playoff_games playoff_game
      where playoff_game.match_id = match.id
    );
$$;

create function private.is_launch_season_roster_rules_locked(
  target_season_id text,
  reference_time timestamptz default clock_timestamp()
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (
      select season.roster_rules_locked_at is not null
        or private.launch_season_roster_rules_lock_at(season.id) <= reference_time
      from public.launch_seasons season
      where season.id = target_season_id
    ),
    false
  );
$$;

create function private.persist_launch_season_roster_rules_lock(target_season_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  calculated_lock_at timestamptz;
begin
  select private.launch_season_roster_rules_lock_at(target_season_id)
  into calculated_lock_at;

  if calculated_lock_at is not null and calculated_lock_at <= clock_timestamp() then
    update public.launch_seasons
    set roster_rules_locked_at = calculated_lock_at
    where id = target_season_id
      and roster_rules_locked_at is null;
  end if;
end;
$$;

create function private.enforce_launch_season_roster_rules_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  calculated_lock_at timestamptz;
  effective_lock_at timestamptz;
begin
  if tg_op = 'INSERT' then
    if new.roster_rules_locked_at is not null then
      raise exception 'Season roster rules lock is database-managed.' using errcode = '42501';
    end if;
    return new;
  end if;

  calculated_lock_at := private.launch_season_roster_rules_lock_at(old.id);
  effective_lock_at := coalesce(old.roster_rules_locked_at, calculated_lock_at);

  if new.roster_rules_locked_at is distinct from old.roster_rules_locked_at then
    if current_user <> 'postgres'
      or old.roster_rules_locked_at is not null
      or new.roster_rules_locked_at is distinct from calculated_lock_at
      or calculated_lock_at is null
      or calculated_lock_at > clock_timestamp()
    then
      raise exception 'Season roster rules lock is database-managed.' using errcode = '42501';
    end if;
  end if;

  if (
    new.mens_roster_cap is distinct from old.mens_roster_cap
    or new.womens_roster_cap is distinct from old.womens_roster_cap
    or new.junior_roster_cap is distinct from old.junior_roster_cap
  ) and effective_lock_at is not null and effective_lock_at <= clock_timestamp() then
    raise exception 'Season roster rules are locked.' using errcode = '42501';
  end if;

  if old.roster_rules_locked_at is null
    and calculated_lock_at is not null
    and calculated_lock_at <= clock_timestamp()
  then
    new.roster_rules_locked_at := calculated_lock_at;
  end if;

  return new;
end;
$$;

create function private.preserve_launch_season_roster_rules_before_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.persist_launch_season_roster_rules_lock(old.season_id);
  return old;
end;
$$;

create function private.persist_launch_season_roster_rules_after_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.persist_launch_season_roster_rules_lock(new.season_id);
  return new;
end;
$$;

create function private.preserve_launch_season_roster_rules_before_playoff_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_season_id text;
  new_season_id text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select match.season_id into old_season_id
    from public.launch_schedule_matches match
    where match.id = old.match_id;
    perform private.persist_launch_season_roster_rules_lock(old_season_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select match.season_id into new_season_id
    from public.launch_schedule_matches match
    where match.id = new.match_id;
    perform private.persist_launch_season_roster_rules_lock(new_season_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create function private.persist_launch_season_roster_rules_after_playoff_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_season_id text;
begin
  select match.season_id into target_season_id
  from public.launch_schedule_matches match
  where match.id = old.match_id;
  perform private.persist_launch_season_roster_rules_lock(target_season_id);
  return old;
end;
$$;

update public.launch_seasons season
set roster_rules_locked_at = private.launch_season_roster_rules_lock_at(season.id)
where season.roster_rules_locked_at is null
  and private.launch_season_roster_rules_lock_at(season.id) <= clock_timestamp();

create trigger enforce_launch_season_roster_rules_lock
before insert or update on public.launch_seasons
for each row execute function private.enforce_launch_season_roster_rules_lock();

create trigger preserve_launch_match_roster_rules_before_change
before update or delete on public.launch_schedule_matches
for each row execute function private.preserve_launch_season_roster_rules_before_schedule_change();

create trigger persist_launch_match_roster_rules_after_change
after insert or update on public.launch_schedule_matches
for each row execute function private.persist_launch_season_roster_rules_after_schedule_change();

create trigger preserve_launch_round_roster_rules_before_change
before update or delete on public.launch_rounds
for each row execute function private.preserve_launch_season_roster_rules_before_schedule_change();

create trigger persist_launch_round_roster_rules_after_change
after insert or update on public.launch_rounds
for each row execute function private.persist_launch_season_roster_rules_after_schedule_change();

create trigger preserve_launch_schedule_roster_rules_before_change
before update or delete on public.launch_schedules
for each row execute function private.preserve_launch_season_roster_rules_before_schedule_change();

create trigger persist_launch_schedule_roster_rules_after_change
after insert or update on public.launch_schedules
for each row execute function private.persist_launch_season_roster_rules_after_schedule_change();

create trigger preserve_launch_playoff_roster_rules_before_change
before insert or update or delete on public.launch_playoff_games
for each row execute function private.preserve_launch_season_roster_rules_before_playoff_change();

create trigger persist_launch_playoff_roster_rules_after_delete
after delete on public.launch_playoff_games
for each row execute function private.persist_launch_season_roster_rules_after_playoff_delete();

create function public.get_launch_season_roster_rules_states(target_season_ids text[])
returns table (
  season_id text,
  lock_at timestamptz,
  locked_at timestamptz,
  locked boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select season.id,
    eligible_match.lock_at,
    season.roster_rules_locked_at,
    season.roster_rules_locked_at is not null
      or eligible_match.lock_at <= statement_timestamp()
  from public.launch_seasons season
  left join lateral (
    select min((match.date + match.time) at time zone 'America/New_York') as lock_at
    from public.launch_schedule_matches match
    join public.launch_rounds round
      on round.id = match.round_id
     and round.season_id = match.season_id
    join public.launch_schedules schedule
      on schedule.id = round.schedule_id
     and schedule.season_id = match.season_id
    where match.season_id = season.id
      and match.date is not null
      and match.home_team_id is not null
      and match.away_team_id is not null
      and match.status in ('Scheduled', 'Rain Delay', 'Completed')
      and round.published = true
      and schedule.published = true
      and not exists (
        select 1
        from public.launch_playoff_games playoff_game
        where playoff_game.match_id = match.id
      )
  ) eligible_match on true
  where season.id = any(target_season_ids);
$$;

revoke all on function private.launch_season_roster_rules_lock_at(text) from public, anon, authenticated;
revoke all on function private.is_launch_season_roster_rules_locked(text, timestamptz) from public, anon, authenticated;
revoke all on function private.persist_launch_season_roster_rules_lock(text) from public, anon, authenticated;
revoke all on function private.enforce_launch_season_roster_rules_lock() from public, anon, authenticated;
revoke all on function private.preserve_launch_season_roster_rules_before_schedule_change() from public, anon, authenticated;
revoke all on function private.persist_launch_season_roster_rules_after_schedule_change() from public, anon, authenticated;
revoke all on function private.preserve_launch_season_roster_rules_before_playoff_change() from public, anon, authenticated;
revoke all on function private.persist_launch_season_roster_rules_after_playoff_delete() from public, anon, authenticated;

-- The season update trigger runs as the authenticated caller and must be able
-- to calculate the trusted lock instant. The helper remains outside the
-- PostgREST-exposed public schema and retains the caller's RLS visibility.
grant execute on function private.launch_season_roster_rules_lock_at(text) to authenticated;

revoke all on function public.get_launch_season_roster_rules_states(text[]) from public;
grant execute on function public.get_launch_season_roster_rules_states(text[]) to anon, authenticated;
