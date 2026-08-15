create table public.launch_season_teams (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.launch_seasons(id) on delete restrict,
  team_id text not null references public.launch_teams(id) on delete restrict,
  added_by text not null references public.launch_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (season_id, team_id)
);

create table public.launch_season_roster_memberships (
  id uuid primary key default gen_random_uuid(),
  season_id text not null,
  team_id text not null,
  player_id text not null references public.launch_players(id) on delete restrict,
  roster_category text not null check (roster_category in ('Men', 'Women', 'Junior')),
  status text not null default 'Active' check (status in ('Active', 'Dropped')),
  added_by text not null references public.launch_profiles(id) on delete restrict,
  added_at timestamptz not null default now(),
  dropped_by text null references public.launch_profiles(id) on delete restrict,
  dropped_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, player_id),
  foreign key (season_id, team_id)
    references public.launch_season_teams(season_id, team_id)
    on delete restrict,
  check (
    (status = 'Active' and dropped_by is null and dropped_at is null)
    or
    (status = 'Dropped' and dropped_by is not null and dropped_at is not null)
  )
);

create index launch_season_teams_team_id_idx
on public.launch_season_teams(team_id);

create index launch_season_teams_added_by_idx
on public.launch_season_teams(added_by);

create index launch_season_roster_memberships_team_status_category_idx
on public.launch_season_roster_memberships(season_id, team_id, status, roster_category);

create index launch_season_roster_memberships_player_id_idx
on public.launch_season_roster_memberships(player_id);

create index launch_season_roster_memberships_added_by_idx
on public.launch_season_roster_memberships(added_by);

create index launch_season_roster_memberships_dropped_by_idx
on public.launch_season_roster_memberships(dropped_by)
where dropped_by is not null;

create function private.validate_launch_season_roster_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Season roster memberships cannot be deleted.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.launch_players player
    where player.id = new.player_id
      and player.active = true
  ) then
    raise exception 'Season roster player must be active.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.season_id is distinct from old.season_id
      or new.player_id is distinct from old.player_id
      or new.added_by is distinct from old.added_by
      or new.added_at is distinct from old.added_at
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Season roster membership identity and add audit fields cannot be changed.' using errcode = '23514';
    end if;

    if old.status = 'Dropped' and new.status is distinct from old.status then
      raise exception 'Dropped season roster members cannot be reactivated.' using errcode = '42501';
    end if;

    if (
      new.team_id is distinct from old.team_id
      or new.roster_category is distinct from old.roster_category
    ) and private.is_launch_season_roster_rules_locked(old.season_id, clock_timestamp()) then
      raise exception 'Season roster membership team and category are locked.' using errcode = '42501';
    end if;

    if new.status = old.status and (
      new.dropped_by is distinct from old.dropped_by
      or new.dropped_at is distinct from old.dropped_at
    ) then
      raise exception 'Season roster membership drop audit fields are database-managed.' using errcode = '42501';
    end if;

    new.updated_at := clock_timestamp();
  end if;

  return new;
end;
$$;

create function private.enforce_launch_season_roster_membership_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_cap integer;
  active_count integer;
begin
  if new.status <> 'Active' then
    return new;
  end if;

  select case new.roster_category
    when 'Men' then season.mens_roster_cap
    when 'Women' then season.womens_roster_cap
    when 'Junior' then season.junior_roster_cap
  end
  into category_cap
  from public.launch_seasons season
  where season.id = new.season_id
  for update;

  if not found then
    raise exception 'Season not found.' using errcode = '23503';
  end if;

  if category_cap is null then
    return new;
  end if;

  select count(*)::integer
  into active_count
  from public.launch_season_roster_memberships membership
  where membership.season_id = new.season_id
    and membership.team_id = new.team_id
    and membership.roster_category = new.roster_category
    and membership.status = 'Active'
    and membership.id <> new.id;

  if active_count >= category_cap then
    raise exception 'Season roster category cap has been reached.' using errcode = '23514';
  end if;

  return new;
end;
$$;

create function private.add_launch_season_roster_member_at(
  target_season_id text,
  target_team_id text,
  target_player_id text,
  target_roster_category text,
  check_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  season_locked boolean;
  membership_id uuid;
begin
  select profile.id, profile.role, profile.captain_team_id
  into actor
  from public.launch_profiles profile
  where profile.user_id = auth.uid()
    and profile.status = 'Approved'
  limit 1;

  if actor.id is null
    or actor.role not in ('Captain', 'Commissioner')
    or (actor.role = 'Captain' and actor.captain_team_id is distinct from target_team_id)
  then
    raise exception 'Season roster membership addition is not permitted.' using errcode = '42501';
  end if;

  if target_roster_category not in ('Men', 'Women', 'Junior') then
    raise exception 'Season roster category is invalid.' using errcode = '22023';
  end if;

  perform 1
  from public.launch_seasons season
  where season.id = target_season_id
  for update;

  if not found then
    raise exception 'Season not found.' using errcode = '23503';
  end if;

  season_locked := private.is_launch_season_roster_rules_locked(target_season_id, check_at);
  if actor.role = 'Captain' and season_locked then
    raise exception 'Captain additions are closed for this season.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.launch_season_teams season_team
    where season_team.season_id = target_season_id
      and season_team.team_id = target_team_id
  ) then
    raise exception 'Team is not enrolled in this season.' using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.launch_players player
    where player.id = target_player_id
      and player.active = true
  ) then
    raise exception 'Season roster player must be active.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.launch_season_roster_memberships membership
    where membership.season_id = target_season_id
      and membership.player_id = target_player_id
  ) then
    raise exception 'Player already has a permanent membership for this season.' using errcode = '23505';
  end if;

  insert into public.launch_season_roster_memberships (
    season_id,
    team_id,
    player_id,
    roster_category,
    status,
    added_by
  ) values (
    target_season_id,
    target_team_id,
    target_player_id,
    target_roster_category,
    'Active',
    actor.id
  ) returning id into membership_id;

  return membership_id;
end;
$$;

create function public.add_launch_season_roster_member(
  target_season_id text,
  target_team_id text,
  target_player_id text,
  target_roster_category text
)
returns uuid
language sql
volatile
security definer
set search_path = ''
as $$
  select private.add_launch_season_roster_member_at(
    target_season_id,
    target_team_id,
    target_player_id,
    target_roster_category,
    clock_timestamp()
  );
$$;

create function public.drop_launch_season_roster_member(
  target_season_id text,
  target_player_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  membership record;
begin
  select profile.id, profile.role, profile.captain_team_id
  into actor
  from public.launch_profiles profile
  where profile.user_id = auth.uid()
    and profile.status = 'Approved'
  limit 1;

  select roster.id, roster.team_id, roster.status
  into membership
  from public.launch_season_roster_memberships roster
  where roster.season_id = target_season_id
    and roster.player_id = target_player_id
  for update;

  if membership.id is null then
    raise exception 'Season roster membership not found.' using errcode = 'P0002';
  end if;

  if actor.id is null
    or actor.role not in ('Captain', 'Commissioner')
    or (actor.role = 'Captain' and actor.captain_team_id is distinct from membership.team_id)
  then
    raise exception 'Season roster membership drop is not permitted.' using errcode = '42501';
  end if;

  if membership.status <> 'Active' then
    raise exception 'Season roster membership is already dropped.' using errcode = '23514';
  end if;

  update public.launch_season_roster_memberships
  set status = 'Dropped',
      dropped_by = actor.id,
      dropped_at = clock_timestamp()
  where id = membership.id;

  return membership.id;
end;
$$;

create function public.enroll_launch_season_team(
  target_season_id text,
  target_team_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id text;
  season_team_id uuid;
begin
  select profile.id
  into actor_id
  from public.launch_profiles profile
  where profile.user_id = auth.uid()
    and profile.status = 'Approved'
    and profile.role = 'Commissioner'
  limit 1;

  if actor_id is null then
    raise exception 'Season team enrollment requires Commissioner approval.' using errcode = '42501';
  end if;

  perform 1
  from public.launch_seasons season
  where season.id = target_season_id
  for update;

  if not found then
    raise exception 'Season not found.' using errcode = '23503';
  end if;

  if private.is_launch_season_roster_rules_locked(target_season_id, clock_timestamp()) then
    raise exception 'Season team enrollment is locked.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.launch_teams team
    where team.id = target_team_id and team.active = true
  ) then
    raise exception 'Active team not found.' using errcode = '23503';
  end if;

  insert into public.launch_season_teams(season_id, team_id, added_by)
  values (target_season_id, target_team_id, actor_id)
  returning id into season_team_id;

  return season_team_id;
end;
$$;

create trigger validate_launch_season_roster_membership
before insert or update or delete on public.launch_season_roster_memberships
for each row execute function private.validate_launch_season_roster_membership();

create trigger enforce_launch_season_roster_membership_cap
before insert or update on public.launch_season_roster_memberships
for each row execute function private.enforce_launch_season_roster_membership_cap();

alter table public.launch_season_teams enable row level security;
alter table public.launch_season_roster_memberships enable row level security;

revoke all on public.launch_season_teams from anon, authenticated;
revoke all on public.launch_season_roster_memberships from anon, authenticated;

grant select on public.launch_season_teams to anon, authenticated;
grant select on public.launch_season_roster_memberships to anon, authenticated;

create policy "public reads published season teams"
on public.launch_season_teams
for select
to anon, authenticated
using (
  exists (
    select 1 from public.launch_seasons season
    where season.id = launch_season_teams.season_id
      and season.published = true
  )
);

create policy "captains commissioners read managed season teams"
on public.launch_season_teams
for select
to authenticated
using (
  private.is_launch_captain_for_team(team_id)
  or private.is_launch_commissioner()
);

create policy "public reads active published season roster members"
on public.launch_season_roster_memberships
for select
to anon, authenticated
using (
  status = 'Active'
  and exists (
    select 1 from public.launch_seasons season
    where season.id = launch_season_roster_memberships.season_id
      and season.published = true
  )
);

create policy "captains commissioners read managed season roster members"
on public.launch_season_roster_memberships
for select
to authenticated
using (
  private.is_launch_captain_for_team(team_id)
  or private.is_launch_commissioner()
);

revoke all on function private.validate_launch_season_roster_membership()
from public, anon, authenticated, service_role;
revoke all on function private.enforce_launch_season_roster_membership_cap()
from public, anon, authenticated, service_role;
revoke all on function private.add_launch_season_roster_member_at(text, text, text, text, timestamptz)
from public, anon, authenticated, service_role;

revoke all on function public.add_launch_season_roster_member(text, text, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.drop_launch_season_roster_member(text, text)
from public, anon, authenticated, service_role;
revoke all on function public.enroll_launch_season_team(text, text)
from public, anon, authenticated, service_role;

grant execute on function public.add_launch_season_roster_member(text, text, text, text)
to authenticated;
grant execute on function public.drop_launch_season_roster_member(text, text)
to authenticated;
grant execute on function public.enroll_launch_season_team(text, text)
to authenticated;
