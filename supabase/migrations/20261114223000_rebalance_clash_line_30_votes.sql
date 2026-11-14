-- Rebalance the commissioner pilot for approximately 30 picks per matchup.
-- Zero vote records are present at rollout; keep opening and accepted lines intact.
-- Only replace the function: all private RLS and service-role grants remain as before.
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
  v_opening_line numeric(4,1);
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
    v_opening_line := p_expected_home_line;
  else
    if poll.home_team_id <> m.home_team_id or poll.away_team_id <> m.away_team_id then
      raise exception 'clash_teams_changed';
    end if;
    v_old_line := poll.current_home_line;
    v_opening_line := poll.home_line;
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

  -- One half point for each six net picks; cap at 1.5 points.
  -- trunc moves toward zero so one through five net picks do not move the line.
  v_movement := greatest(-3, least(3,
    trunc((v_favorite_picks - v_underdog_picks)::numeric / 6)
  )) * 0.5;
  v_new_line := sign(v_opening_line)
    * greatest(0.5,least(36,abs(v_opening_line) + v_movement));
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
