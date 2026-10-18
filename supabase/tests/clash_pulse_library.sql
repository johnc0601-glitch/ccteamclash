-- Run on staging after the additive migration. Every test write rolls back.
begin;
create temporary table pulse_source_probe(match_id text);
create constraint trigger pulse_source_probe_changed after insert on pulse_source_probe
  deferrable initially deferred for each row execute function private.queue_clash_pulse_generation();
grant insert on pulse_source_probe to authenticated;
select set_config('request.jwt.claim.sub', (select user_id::text from public.launch_profiles
  where role='Commissioner' and status='Approved' limit 1), true);
set local role authenticated;
do $$
declare season text := 'coastal-clash-2026-2027-7806a8e2-6755-4310-ad2b-7b2c761752c9';
  round text := '2026-schedule-1-d2887d97-30a6-474d-90fc-17b37e2cbe0e';
  report jsonb; fid uuid; featured uuid; stamp timestamptz := now(); revisions integer;
begin
  report := jsonb_build_object('complete',true,'finalized',4,'scheduled',4,'warnings','[]'::jsonb,
    'facts',jsonb_build_array(jsonb_build_object('fact_key','staging-test:ci:hastin','category','CI movement',
      'fact_text','Hastin McGill (Beast Mode): +25 CI across 2 played contests.',
      'match_id',null,'team_ids',jsonb_build_array('beast-mode'),'player_ids',jsonb_build_array('hastin-mcgill'),
      'sources',jsonb_build_array(jsonb_build_object('table','clash_contest_rating_facts','ids',jsonb_build_array('test-ref'))),
      'calculation','16 + 9 = 25','metric',25,'ranking',1)));
  perform public.save_clash_pulse_generation(season,round,stamp,report);
  select id into fid from public.clash_pulse_facts where round_id=round and fact_key='staging-test:ci:hastin';
  if fid is null then raise exception 'No generated fact'; end if;
  if exists(select 1 from public.clash_pulse_facts where id=fid and (status <> 'pending' or featured_item_id is not null)) then
    raise exception 'Generated fact was published automatically'; end if;
  begin
    perform public.review_clash_pulse_fact(fid,'feature');
    raise exception 'Expected approve-before-feature rejection';
  exception when raise_exception then
    if sqlerrm <> 'Approve this fact before featuring' then raise; end if;
  end;
  perform public.review_clash_pulse_fact(fid,'approve');
  perform public.review_clash_pulse_fact(fid,'feature');
  select featured_item_id into featured from public.clash_pulse_facts where id=fid;
  if not exists(select 1 from public.clash_pulse_items where id=featured and is_active) then raise exception 'Feature failed'; end if;
  select count(*) into revisions from public.clash_pulse_fact_revisions where fact_id=fid;
  perform public.save_clash_pulse_generation(season,round,stamp + interval '1 second',report);
  if not exists(select 1 from public.clash_pulse_facts where id=fid and status='approved' and featured_item_id=featured) then
    raise exception 'Unchanged regeneration lost review'; end if;
  if (select count(*) from public.clash_pulse_fact_revisions where fact_id=fid) <> revisions then raise exception 'Unchanged generation created revisions'; end if;
  report := jsonb_set(report,'{facts,0,fact_text}','"Corrected CI movement: +24"');
  perform public.save_clash_pulse_generation(season,round,stamp + interval '2 seconds',report);
  if exists(select 1 from public.clash_pulse_items where id=featured and is_active) then raise exception 'Stale homepage fact remains public'; end if;
  if not exists(select 1 from public.clash_pulse_facts where id=fid and status='pending' and featured_item_id is null) then
    raise exception 'Changed fact not reset for review'; end if;
  begin
    perform public.save_clash_pulse_generation(season,round,stamp,report);
    raise exception 'Expected stale generation rejection';
  exception when raise_exception then
    if sqlerrm <> 'A newer generation exists; refresh before retrying' then raise; end if;
  end;
  perform public.review_clash_pulse_fact(fid,'approve');
  perform public.review_clash_pulse_fact(fid,'feature');
  select featured_item_id into featured from public.clash_pulse_facts where id=fid;
  insert into pg_temp.pulse_source_probe(match_id)
    select id from public.launch_schedule_matches where round_id=round limit 1;
  set constraints all immediate;
  if exists(select 1 from public.clash_pulse_items where id=featured and is_active) then raise exception 'Source correction left stale highlight public'; end if;
  if exists(select 1 from public.clash_pulse_facts where id=fid and is_current) then raise exception 'Source correction left stale library fact current'; end if;
  perform public.save_clash_pulse_generation(season,round,stamp + interval '3 seconds',report);
  perform public.review_clash_pulse_fact(fid,'hide');
  if not exists(select 1 from public.clash_pulse_facts where id=fid and status='hidden') then raise exception 'Hide failed'; end if;
  report := jsonb_set(report,'{facts}','[]');
  perform public.save_clash_pulse_generation(season,round,stamp + interval '4 seconds',report);
  if exists(select 1 from public.clash_pulse_facts where id=fid and is_current) then raise exception 'Removed fact not retired'; end if;
end $$;
-- Exercise the real invalidation trigger without modifying a canonical result.
insert into pulse_source_probe(match_id)
  select id from public.launch_schedule_matches where round_id='2026-schedule-1-d2887d97-30a6-474d-90fc-17b37e2cbe0e' limit 1;
set constraints all immediate;
do $$ begin
  if not exists(select 1 from public.clash_pulse_generation_queue
    where round_id='2026-schedule-1-d2887d97-30a6-474d-90fc-17b37e2cbe0e') then
    raise exception 'Source changes did not enqueue a durable retry'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.clash_pulse_facts) then raise exception 'Noncommissioner can read private library'; end if;
  begin
    perform public.review_clash_pulse_fact('00000000-0000-0000-0000-000000000000','approve');
    raise exception 'Expected commissioner rejection';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if has_table_privilege('anon','public.clash_pulse_facts','select') then raise exception 'Anonymous library access'; end if;
  if has_function_privilege('anon','public.review_clash_pulse_fact(uuid,text)','execute') then raise exception 'Anonymous review access'; end if;
end $$;
rollback;
