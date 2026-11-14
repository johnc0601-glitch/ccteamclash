-- Each commissioner can affect a recreational line without showing votes.
-- Moving lines preserve the opening spread and the quote at which each pick was made.
alter table public.launch_match_spread_polls
  add column if not exists current_home_line numeric(4,1),
  add column if not exists updated_at timestamptz not null default now();
update public.launch_match_spread_polls set current_home_line = home_line where current_home_line is null;
alter table public.launch_match_spread_polls alter column current_home_line set not null;
alter table public.launch_match_spread_polls
  drop constraint if exists launch_match_spread_polls_current_home_line_check;
alter table public.launch_match_spread_polls
  add constraint launch_match_spread_polls_current_home_line_check
  check (current_home_line <> 0 and abs(current_home_line) between 0.5 and 36 and current_home_line * 2 = trunc(current_home_line * 2));

alter table public.launch_match_spread_votes add column if not exists accepted_home_line numeric(4,1);
update public.launch_match_spread_votes v
set accepted_home_line = p.home_line
from public.launch_match_spread_polls p
where v.match_id = p.match_id and v.accepted_home_line is null;
alter table public.launch_match_spread_votes alter column accepted_home_line set not null;

create table if not exists public.launch_match_spread_movements (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.launch_match_spread_polls(match_id) on delete cascade,
  from_home_line numeric(4,1) not null,
  to_home_line numeric(4,1) not null,
  actor_profile_id text not null references public.launch_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists launch_match_spread_movements_history_idx
  on public.launch_match_spread_movements(match_id, created_at desc);
alter table public.launch_match_spread_movements enable row level security;
revoke all on public.launch_match_spread_movements from public, anon, authenticated;
grant select, insert, update, delete on public.launch_match_spread_movements to service_role;

-- Service-role-only, invoker-privilege function. A row lock serializes
-- simultaneous commissioner picks and ensures accepted quotes are honest.
create or replace function public.cast_clash_spread_pick(
  p_match_id text,
  p_profile_id text,
  p_choice text,
  p_expected_home_line numeric
)
returns numeric
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  m record;
  poll record;
  v_favorite_picks integer;
  v_underdog_picks integer;
  v_movement numeric;
  v_new_line numeric(4,1);
  v_old_line numeric(4,1);
begin
  if p_choice not in ('high', 'low')
    or p_expected_home_line is null
    or p_expected_home_line = 0
    or abs(p_expected_home_line) > 36
    or p_expected_home_line * 2 <> trunc(p_expected_home_line * 2) then
    raise exception 'invalid_clash_pick';
  end if;

  perform 1 from public.launch_profiles
  where id = p_profile_id and role = 'Commissioner' and status = 'Approved';
  if not found then
    raise exception 'commissioner_access_required';
  end if;

  select id, date, time, status, home_team_id, away_team_id
    into m
  from public.launch_schedule_matches
  where id = p_match_id
  for update;
  if not found or m.status <> 'Scheduled' or m.date is null or m.time is null
     or m.home_team_id is null or m.away_team_id is null
     or (clock_timestamp() at time zone 'America/New_York') >= (m.date + m.time) then
    raise exception 'clash_picks_closed';
  end if;

  select match_id,home_line,current_home_line,home_team_id,away_team_id
    into poll
  from public.launch_match_spread_polls
  where match_id = p_match_id
  for update;

  if not found then
    insert into public.launch_match_spread_polls
      (match_id,home_team_id,away_team_id,home_line,current_home_line,created_by_profile_id)
    values
      (p_match_id,m.home_team_id,m.away_team_id,p_expected_home_line,p_expected_home_line,p_profile_id);
    v_old_line := p_expected_home_line;
    poll.home_line := p_expected_home_line;
  else
    if poll.home_team_id <> m.home_team_id or poll.away_team_id <> m.away_team_id then
      raise exception 'clash_teams_changed';
    end if;
    v_old_line := poll.current_home_line;
  end if;

  if v_old_line <> p_expected_home_line then
    raise exception 'stale_clash_line';
  end if;

  insert into public.launch_match_spread_votes
    (match_id,profile_id,choice,accepted_home_line)
  values
    (p_match_id,p_profile_id,p_choice,v_old_line)
  on conflict (match_id,profile_id)
  do update set
    choice = excluded.choice,
    accepted_home_line = case
      when public.launch_match_spread_votes.choice is distinct from excluded.choice
      then excluded.accepted_home_line
      else public.launch_match_spread_votes.accepted_home_line
    end,
    updated_at = case
      when public.launch_match_spread_votes.choice is distinct from excluded.choice
      then clock_timestamp()
      else public.launch_match_spread_votes.updated_at
    end;

  select count(*) filter (where choice = 'low'),
         count(*) filter (where choice = 'high')
    into v_favorite_picks,v_underdog_picks
  from public.launch_match_spread_votes where match_id = p_match_id;

  -- Max two points from the CI opening line, no favorite reversal.
  v_movement := greatest(-4,least(4,v_favorite_picks - v_underdog_picks)) * 0.5;
  v_new_line := sign(poll.home_line)
    * greatest(0.5,least(36,abs(poll.home_line) + v_movement));
  if v_new_line <> v_old_line then
    update public.launch_match_spread_polls
    set current_home_line = v_new_line, updated_at = clock_timestamp()
    where match_id = p_match_id;
    insert into public.launch_match_spread_movements
      (match_id,from_home_line,to_home_line,actor_profile_id)
    values (p_match_id,v_old_line,v_new_line,p_profile_id);
  end if;
  return v_new_line;
end;
$$;
revoke all on function public.cast_clash_spread_pick(text,text,text,numeric)
  from public, anon, authenticated;
grant execute on function public.cast_clash_spread_pick(text,text,text,numeric) to service_role;
notify pgrst, 'reload schema';
