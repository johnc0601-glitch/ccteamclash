-- Additive library. Existing short homepage items and public read policies stay intact.
create table if not exists public.clash_pulse_facts (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.launch_seasons(id),
  round_id text not null references public.launch_rounds(id),
  fact_key text not null,
  category text not null,
  fact_text text not null check (length(fact_text) between 1 and 4000),
  match_id text references public.launch_schedule_matches(id),
  team_ids text[] not null default '{}',
  player_ids text[] not null default '{}',
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  calculation text not null,
  metric numeric,
  ranking integer,
  origin text not null default 'generated' check (origin in ('generated','editorial')),
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  is_current boolean not null default true,
  source_hash text not null,
  generator_version text not null default 'pulse-2-v1',
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  featured_item_id uuid references public.clash_pulse_items(id),
  unique(round_id, fact_key)
);
create index if not exists clash_pulse_facts_scope_idx on public.clash_pulse_facts(season_id, round_id, is_current);
create index if not exists clash_pulse_facts_teams_idx on public.clash_pulse_facts using gin(team_ids);
create index if not exists clash_pulse_facts_players_idx on public.clash_pulse_facts using gin(player_ids);
create table if not exists public.clash_pulse_fact_revisions (
  id bigint generated always as identity primary key,
  fact_id uuid not null references public.clash_pulse_facts(id),
  previous jsonb not null,
  replaced_at timestamptz not null default now()
);
create table if not exists public.clash_pulse_generations (
  round_id text primary key references public.launch_rounds(id),
  started_at timestamptz not null,
  generated_at timestamptz not null default now(),
  complete boolean not null,
  finalized integer not null,
  scheduled integer not null,
  warnings jsonb not null default '[]'
);
create table if not exists public.clash_pulse_generation_queue (
  round_id text primary key references public.launch_rounds(id),
  requested_at timestamptz not null default clock_timestamp()
);
alter table public.clash_pulse_generation_queue enable row level security;
revoke all on public.clash_pulse_generation_queue from anon, authenticated;
grant select,insert,update,delete on public.clash_pulse_generation_queue to authenticated;
drop policy if exists "commissioner pulse queue" on public.clash_pulse_generation_queue;
create policy "commissioner pulse queue" on public.clash_pulse_generation_queue for all to authenticated
  using ((select private.is_launch_commissioner())) with check ((select private.is_launch_commissioner()));
alter table public.clash_pulse_facts enable row level security;
alter table public.clash_pulse_fact_revisions enable row level security;
alter table public.clash_pulse_generations enable row level security;
revoke all on public.clash_pulse_facts, public.clash_pulse_fact_revisions, public.clash_pulse_generations from anon, authenticated;
grant select,insert,update on public.clash_pulse_facts, public.clash_pulse_generations to authenticated;
grant select,insert on public.clash_pulse_fact_revisions to authenticated;
grant usage on sequence public.clash_pulse_fact_revisions_id_seq to authenticated;
drop policy if exists "commissioner pulse facts" on public.clash_pulse_facts;
create policy "commissioner pulse facts" on public.clash_pulse_facts for all to authenticated
  using ((select private.is_launch_commissioner())) with check ((select private.is_launch_commissioner()));
drop policy if exists "commissioner pulse revisions" on public.clash_pulse_fact_revisions;
create policy "commissioner pulse revisions" on public.clash_pulse_fact_revisions for all to authenticated
  using ((select private.is_launch_commissioner())) with check ((select private.is_launch_commissioner()));
drop policy if exists "commissioner pulse generations" on public.clash_pulse_generations;
create policy "commissioner pulse generations" on public.clash_pulse_generations for all to authenticated
  using ((select private.is_launch_commissioner())) with check ((select private.is_launch_commissioner()));

-- One transaction retires removed facts, invalidates changed reviews/highlights,
-- and retains unchanged decisions. No writes to results, ratings, snapshots or stories.
create or replace function public.save_clash_pulse_generation(p_season_id text, p_round_id text,
  p_started_at timestamptz, p_report jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare v record; f jsonb; old_row public.clash_pulse_facts; fingerprint text;
begin
  if not private.is_launch_commissioner() then raise exception 'Commissioner access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pulse:' || p_round_id, 0));
  if not exists(select 1 from public.launch_rounds where id=p_round_id and season_id=p_season_id) then
    raise exception 'Round does not belong to season'; end if;
  if exists(select 1 from public.clash_pulse_generations where round_id=p_round_id and started_at > p_started_at) then
    raise exception 'A newer generation exists; refresh before retrying'; end if;
  if exists(select 1 from public.clash_pulse_generation_queue where round_id=p_round_id and requested_at > p_started_at) then
    raise exception 'Sources changed during generation; refresh before retrying'; end if;
  for v in select * from public.clash_pulse_facts where round_id=p_round_id and origin='generated' and is_current
    and not exists(select 1 from jsonb_array_elements(p_report->'facts') x where x->>'fact_key'=fact_key)
  loop
    insert into public.clash_pulse_fact_revisions(fact_id,previous) values(v.id,to_jsonb(v));
    update public.clash_pulse_items set is_active=false,updated_at=now() where id=v.featured_item_id;
    update public.clash_pulse_facts set is_current=false,featured_item_id=null where id=v.id;
  end loop;
  for f in select value from jsonb_array_elements(p_report->'facts') loop
    fingerprint := md5(f::text);
    select * into old_row from public.clash_pulse_facts where round_id=p_round_id and fact_key=f->>'fact_key';
    if found and old_row.source_hash=fingerprint and old_row.is_current then continue; end if;
    if old_row.id is not null then
      insert into public.clash_pulse_fact_revisions(fact_id,previous) values(old_row.id,to_jsonb(old_row));
      update public.clash_pulse_items set is_active=false,updated_at=now() where id=old_row.featured_item_id;
    end if;
    insert into public.clash_pulse_facts(season_id,round_id,fact_key,category,fact_text,match_id,team_ids,player_ids,
      sources,calculation,metric,ranking,source_hash)
    values(p_season_id,p_round_id,f->>'fact_key',f->>'category',f->>'fact_text',f->>'match_id',
      array(select jsonb_array_elements_text(f->'team_ids')),array(select jsonb_array_elements_text(f->'player_ids')),
      f->'sources',f->>'calculation',(f->>'metric')::numeric,(f->>'ranking')::integer,fingerprint)
    on conflict(round_id,fact_key) do update set category=excluded.category,fact_text=excluded.fact_text,match_id=excluded.match_id,
      team_ids=excluded.team_ids,player_ids=excluded.player_ids,sources=excluded.sources,calculation=excluded.calculation,
      metric=excluded.metric,ranking=excluded.ranking,source_hash=excluded.source_hash,generated_at=now(),
      status='pending',is_current=true,featured_item_id=null,reviewed_at=null,reviewed_by=null;
  end loop;
  insert into public.clash_pulse_generations(round_id,started_at,complete,finalized,scheduled,warnings)
    values(p_round_id,p_started_at,(p_report->>'complete')::boolean,(p_report->>'finalized')::integer,
      (p_report->>'scheduled')::integer,p_report->'warnings')
    on conflict(round_id) do update set started_at=excluded.started_at,generated_at=now(),complete=excluded.complete,
      finalized=excluded.finalized,scheduled=excluded.scheduled,warnings=excluded.warnings;
  delete from public.clash_pulse_generation_queue where round_id=p_round_id;
end $$;
revoke all on function public.save_clash_pulse_generation(text,text,timestamptz,jsonb) from public,anon;
grant execute on function public.save_clash_pulse_generation(text,text,timestamptz,jsonb) to authenticated;

create or replace function public.review_clash_pulse_fact(p_id uuid,p_action text) returns void
language plpgsql security invoker set search_path='' as $$
declare f public.clash_pulse_facts; item_id uuid;
begin
  if not private.is_launch_commissioner() then raise exception 'Commissioner access required' using errcode='42501'; end if;
  select * into f from public.clash_pulse_facts where id=p_id;
  if not found then raise exception 'Fact not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pulse:' || f.round_id,0));
  select * into f from public.clash_pulse_facts where id=p_id for update;
  if not f.is_current then raise exception 'Fact has been superseded'; end if;
  if p_action not in ('approve','hide','feature','unfeature') then raise exception 'Invalid review action'; end if;
  insert into public.clash_pulse_fact_revisions(fact_id,previous) values(f.id,to_jsonb(f));
  if p_action='feature' then
    if f.status <> 'approved' then raise exception 'Approve this fact before featuring'; end if;
    if length(f.fact_text)>240 then raise exception 'Homepage highlights must be at most 240 characters'; end if;
    if f.featured_item_id is null then
      insert into public.clash_pulse_items(category,fact_text,season_id,match_id,is_active)
        values(case f.category when 'Upsets' then 'Upset' when 'CI movement' then 'Clash Index'
          when 'History' then 'History' else 'League' end,f.fact_text,f.season_id,f.match_id,true) returning id into item_id;
    else
      item_id := f.featured_item_id;
      update public.clash_pulse_items set is_active=true,updated_at=now(),published_at=now() where id=item_id;
    end if;
    update public.clash_pulse_facts set featured_item_id=item_id where id=f.id;
  elsif p_action in ('hide','unfeature') then
    update public.clash_pulse_items set is_active=false,updated_at=now() where id=f.featured_item_id;
    update public.clash_pulse_facts set featured_item_id=null,status=case when p_action='hide' then 'hidden' else status end,
      reviewed_at=now(),reviewed_by=auth.uid() where id=f.id;
  else
    update public.clash_pulse_facts set status='approved',reviewed_at=now(),reviewed_by=auth.uid() where id=f.id;
  end if;
end $$;
revoke all on function public.review_clash_pulse_fact(uuid,text) from public,anon;
grant execute on function public.review_clash_pulse_fact(uuid,text) to authenticated;

-- Canonical writes enqueue a durable retry and immediately retire derived highlights.
-- Deferred triggers see the finalized transaction. They never change source records.
create or replace function private.queue_clash_pulse_generation() returns trigger
language plpgsql security invoker set search_path='' as $$
declare affected_round text; row_data jsonb;
begin
  if tg_table_name='launch_match_final_snapshots' and tg_op='UPDATE'
    and (to_jsonb(new)->'payload') is not distinct from (to_jsonb(old)->'payload')
    and (to_jsonb(new)->'locked') is not distinct from (to_jsonb(old)->'locked') then return null; end if;
  row_data := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  select round_id into affected_round from public.launch_schedule_matches where id=row_data->>'match_id';
  if affected_round is null then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('pulse:' || affected_round,0));
  insert into public.clash_pulse_generation_queue(round_id) values(affected_round)
    on conflict(round_id) do update set requested_at=clock_timestamp();
  update public.clash_pulse_items set is_active=false,updated_at=now() where id in
    (select featured_item_id from public.clash_pulse_facts where round_id=affected_round and origin='generated' and is_current);
  insert into public.clash_pulse_fact_revisions(fact_id,previous)
    select id,to_jsonb(f) from public.clash_pulse_facts f where round_id=affected_round and origin='generated' and is_current;
  update public.clash_pulse_facts set is_current=false,featured_item_id=null
    where round_id=affected_round and origin='generated' and is_current;
  return null;
end $$;
revoke all on function private.queue_clash_pulse_generation() from public, anon, authenticated;
do $$
declare source_table text;
begin
  foreach source_table in array array['launch_match_results','clash_match_publications','clash_contest_rating_facts','launch_match_final_snapshots','launch_match_structural_points'] loop
    if to_regclass('public.' || source_table) is not null then
      execute format('drop trigger if exists pulse_source_changed on public.%I',source_table);
      execute format('create constraint trigger pulse_source_changed after insert or update or delete on public.%I deferrable initially deferred for each row execute function private.queue_clash_pulse_generation()',source_table);
    end if;
  end loop;
end $$;
