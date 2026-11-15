-- Let any signed-in CCTeamClash account play Clash Challenge.
-- No league registration, roster assignment, commissioner status or approval is needed.
-- Keep session-to-profile matching, per-match locking, cutoff and fixed projections.
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
  -- Every authenticated account has a profile. Registration, role and approval
  -- do not gate this free, private league prediction game.
  -- The server verifies the Supabase session before calling this service-only RPC.
  perform 1 from public.launch_profiles p
  where p.id=p_profile_id and p.user_id=p_user_id;
  if not found then raise exception 'signed_in_account_required'; end if;

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
$function$;

revoke all on function public.cast_clash_challenge_ballot(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.cast_clash_challenge_ballot(text,uuid,jsonb) to service_role;
notify pgrst, 'reload schema';
