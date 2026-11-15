-- Lock the displayed Clash Challenge number to a single half-point target.
-- System-frozen polls have no player as creator; existing ballots and numbers survive.
alter table public.launch_match_spread_polls alter column created_by_profile_id drop not null;
update public.launch_match_spread_polls
set current_home_line=home_line,updated_at=now()
where current_home_line is distinct from home_line;
alter table public.launch_match_spread_polls
  add constraint launch_clash_fixed_projection check (home_line=current_home_line);

-- The match-row lock guarantees simultaneous viewers see one frozen result.
create or replace function public.freeze_clash_challenge_projection(
  p_match_id text,
  p_home_line numeric
) returns numeric
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  m record;
  existing record;
begin
  select id,round_id,date,time,status,home_team_id,away_team_id into m
  from public.launch_schedule_matches where id=p_match_id for update;
  if not found or m.status<>'Scheduled' or m.date is null or m.time is null
    or m.home_team_id is null or m.away_team_id is null
    or (clock_timestamp() at time zone 'America/New_York') >= (m.date+m.time) then
    return null;
  end if;
  perform 1 from public.launch_clash_challenge_windows w
    join public.launch_rounds r on r.id=w.round_id and r.published=true
  where w.round_id=m.round_id and clock_timestamp()>=w.opens_at
    and clock_timestamp()<w.closes_at;
  if not found then return null; end if;
  if exists(select 1 from public.launch_match_results r where r.match_id=p_match_id
      and (r.status='Published' or r.published_at is not null))
    or exists(select 1 from public.launch_match_final_snapshots f
      where f.match_id=p_match_id and f.locked=true) then
    return null;
  end if;
  select home_line,home_team_id,away_team_id into existing
  from public.launch_match_spread_polls where match_id=p_match_id for update;
  if found then
    if existing.home_team_id<>m.home_team_id or existing.away_team_id<>m.away_team_id then
      raise exception 'clash_teams_changed';
    end if;
    return existing.home_line;
  end if;
  if p_home_line is null then return null; end if;
  if p_home_line=0 or abs(p_home_line)>36
    or p_home_line*2<>trunc(p_home_line*2) then
    raise exception 'invalid_clash_projection';
  end if;
  insert into public.launch_match_spread_polls
    (match_id,home_team_id,away_team_id,home_line,current_home_line,created_by_profile_id)
  values(p_match_id,m.home_team_id,m.away_team_id,p_home_line,p_home_line,null);
  return p_home_line;
end;
$$;
revoke all on function public.freeze_clash_challenge_projection(text,numeric) from public,anon,authenticated;
grant execute on function public.freeze_clash_challenge_projection(text,numeric) to service_role;

-- Preserve the existing user checks, round windows, and close-at-start behavior.
CREATE OR REPLACE FUNCTION public.cast_clash_challenge_ballot(p_profile_id text, p_user_id uuid, p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  item jsonb;
  m record;
  poll record;
  v_match_id text;
  v_choice text;
  v_prev_match_id text := '';
  v_expected numeric;
  v_old numeric;
  v_opening numeric;
  v_count integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 4 then
    raise exception 'invalid_clash_ballot';
  end if;
  perform 1 from public.launch_profiles p
  join public.launch_players lp on lp.id=p.player_id
  where p.id=p_profile_id and p.user_id=p_user_id and p.status='Approved'
    and p.role in ('Player','Captain','Commissioner');
  if not found then raise exception 'registered_player_required'; end if;

  -- A deterministic lock order prevents concurrent four-match ballots from deadlocking.
  for item in select value from jsonb_array_elements(p_items) order by value->>'match_id'
  loop
    if jsonb_typeof(item) <> 'object'
      or jsonb_typeof(item->'match_id') <> 'string'
      or jsonb_typeof(item->'choice') <> 'string'
      or jsonb_typeof(item->'expected_home_line') <> 'number' then
      raise exception 'invalid_clash_ballot';
    end if;
    v_match_id := item->>'match_id';
    v_choice := item->>'choice';
    if v_match_id = v_prev_match_id or length(v_match_id) > 220 or v_choice not in ('low','high') then
      raise exception 'invalid_clash_ballot';
    end if;
    v_prev_match_id := v_match_id;
    v_expected := (item->>'expected_home_line')::numeric;
    if v_expected = 0 or abs(v_expected) > 36
      or v_expected*2 <> trunc(v_expected*2) then
      raise exception 'invalid_clash_ballot';
    end if;

    select id,round_id,date,time,status,home_team_id,away_team_id into m
    from public.launch_schedule_matches where id=v_match_id for update;
    if not found or m.status <> 'Scheduled' or m.date is null or m.time is null
      or m.home_team_id is null or m.away_team_id is null
      or (clock_timestamp() at time zone 'America/New_York') >= (m.date + m.time) then
      raise exception 'clash_picks_closed';
    end if;
    perform 1 from public.launch_clash_challenge_windows w
      join public.launch_rounds r on r.id=w.round_id and r.published=true
    where w.round_id=m.round_id
      and clock_timestamp() >= w.opens_at and clock_timestamp() < w.closes_at;
    if not found then raise exception 'clash_round_changed'; end if;
    if exists(select 1 from public.launch_match_results r
        where r.match_id=v_match_id and (r.status='Published' or r.published_at is not null))
      or exists(select 1 from public.launch_match_final_snapshots f
        where f.match_id=v_match_id and f.locked=true) then
      raise exception 'clash_picks_closed';
    end if;

    select match_id,home_line,current_home_line,home_team_id,away_team_id into poll
    from public.launch_match_spread_polls where match_id=v_match_id for update;
    if not found then
      insert into public.launch_match_spread_polls
        (match_id,home_team_id,away_team_id,home_line,current_home_line,created_by_profile_id)
      values (v_match_id,m.home_team_id,m.away_team_id,v_expected,v_expected,p_profile_id);
      v_old := v_expected;
      v_opening := v_expected;
    else
      if poll.home_team_id <> m.home_team_id or poll.away_team_id <> m.away_team_id then
        raise exception 'clash_teams_changed';
      end if;
      v_old := poll.current_home_line;
      v_opening := poll.home_line;
    end if;
    if v_expected <> v_old then raise exception 'stale_clash_line'; end if;

    insert into public.launch_match_spread_votes(match_id,profile_id,choice,accepted_home_line)
    values(v_match_id,p_profile_id,v_choice,v_old)
    on conflict(match_id,profile_id) do update set
      choice=excluded.choice,
      accepted_home_line=case when public.launch_match_spread_votes.choice is distinct from excluded.choice
        then excluded.accepted_home_line else public.launch_match_spread_votes.accepted_home_line end,
      updated_at=case when public.launch_match_spread_votes.choice is distinct from excluded.choice
        then clock_timestamp() else public.launch_match_spread_votes.updated_at end;

    -- Fixed projection: votes do not change the shared number.
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$function$

CREATE OR REPLACE FUNCTION public.cast_clash_spread_pick(p_match_id text, p_profile_id text, p_choice text, p_expected_home_line numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  m record;
  poll record;
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

  select id, round_id, date, time, status, home_team_id, away_team_id
    into m
  from public.launch_schedule_matches
  where id = p_match_id
  for update;
  if not found or m.status <> 'Scheduled' or m.date is null or m.time is null
     or m.home_team_id is null or m.away_team_id is null
     or (clock_timestamp() at time zone 'America/New_York') >= (m.date + m.time) then
    raise exception 'clash_picks_closed';
  end if;

  -- The feature is visible and playable only during its active round window.
  perform 1 from public.launch_clash_challenge_windows w
  where w.round_id = m.round_id
    and clock_timestamp() >= w.opens_at
    and clock_timestamp() < w.closes_at;
  if not found then raise exception 'clash_picks_closed'; end if;

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

  -- Save the choice only; the match projection never moves.
  return v_opening_line;
end;
$function$

revoke all on function public.cast_clash_challenge_ballot(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.cast_clash_challenge_ballot(text,uuid,jsonb) to service_role;
revoke all on function public.cast_clash_spread_pick(text,text,text,numeric) from public,anon,authenticated;
grant execute on function public.cast_clash_spread_pick(text,text,text,numeric) to service_role;
notify pgrst, 'reload schema';
