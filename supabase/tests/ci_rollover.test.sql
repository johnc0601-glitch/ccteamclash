-- Integration regression against the reviewed Team Clash archive. All writes roll back.
begin;
do $$
declare
  season text := (select id from public.launch_seasons where active);
  payload jsonb;
  first_ci integer;
  old_fact_count bigint := (select count(*) from public.historical_clash_contest_rating_facts);
  old_gain bigint := (select sum(ci_delta) from public.historical_clash_contest_rating_facts where player_id='jason-collet');
begin
  assert private.clash_season_start_ci(931,1006,'2026-05-12','2026-03-31','Open')=969, '50/50 rounding';
  assert private.clash_season_start_ci(931,993,'2026-03-31','2026-03-31','Open')=943, 'same day is not newer';
  assert private.clash_season_start_ci(931,993,'2026-03-30','2026-03-31','Open')=943, 'older date';
  assert private.clash_season_start_ci(931,993,null,'2026-03-31','Open')=943, 'unknown effective date';
  assert private.clash_season_start_ci(931,993,'2026-05-12',null,'Open')=943, 'unknown match date';
  assert private.clash_season_start_ci(931,null,null,null,'Open')=931, 'carry forward';
  assert private.clash_season_start_ci(null,993,null,null,'Open')=993, 'new PDGA';
  assert private.clash_season_start_ci(null,null,null,null,'Women')=700, 'provisional';

  perform set_config('app.clash_rating_engine_write','on',true);
  update public.launch_players set pdga_number='217998', pdga_rating=993,
    pdga_rating_effective_date='2026-05-12' where id='jason-collet';
  perform set_config('app.clash_rating_engine_write','off',true);
  first_ci := (select clash_index from public.launch_players where id='jason-collet');
  payload := public.apply_clash_season_rollover(season,'jason-collet',true);
  assert (payload#>>'{players,0,startingCi}')::integer=962, 'Jason live calculation';
  assert payload#>>'{players,0,matchDateBasis}'='MonthUpperBound', 'do not invent historical exact dates';
  assert (select clash_index from public.launch_players where id='jason-collet')=first_ci, 'preview does not write';
  perform public.apply_clash_season_rollover(season,'jason-collet',false);
  perform public.apply_clash_season_rollover(season,'jason-collet',false);
  assert (select clash_index from public.launch_players where id='jason-collet')=962, 'repeat does not compound';
  assert (select count(*) from public.clash_season_rollovers where player_id='jason-collet' and season_id=season)=1, 'one saved start';
  assert (select prior_final_ci from public.clash_season_rollovers where player_id='jason-collet' and season_id=season)=931, 'preserve prior final';
  assert (select count(*) from public.historical_clash_contest_rating_facts)=old_fact_count, 'historical facts unchanged';
  assert (select sum(ci_delta) from public.historical_clash_contest_rating_facts where player_id='jason-collet')=old_gain, 'rollover is not earned CI';

  payload := public.apply_clash_season_rollover(season,'darian-green',true);
  assert (payload#>>'{players,0,priorFinalCi}')::integer=849, 'skipped season is still returning';
  payload := public.apply_clash_season_rollover(season,null,false);
  assert jsonb_array_length(payload->'players')>100, 'full roster executes atomically';

  -- Commissioner caller exercises the same permissions as the HTTP endpoint.
  perform set_config('request.jwt.claim.sub',(select user_id::text from public.launch_profiles where role='Commissioner' and status='Approved' limit 1),true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  set local role authenticated;
  perform public.apply_clash_season_rollover(season,'jason-collet',false);
  reset role;
  perform set_config('request.jwt.claim.sub','',true);
  set local role authenticated;
  begin
    perform public.apply_clash_season_rollover(season,'jason-collet',false);
    raise exception 'Unauthorized caller was allowed';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- A started season cannot overwrite earned or frozen CI.
  update public.launch_seasons set start_date=(now() at time zone 'America/New_York')::date where id=season;
  begin
    perform public.apply_clash_season_rollover(season,'jason-collet',false);
    raise exception 'Started season was allowed';
  exception when raise_exception then
    if sqlerrm not like 'Starting CI cannot be reset%' then raise; end if;
  end;
end;
$$;
rollback;
