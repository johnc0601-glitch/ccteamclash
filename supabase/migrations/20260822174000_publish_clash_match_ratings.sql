-- Atomic CI publication boundary.
-- Caller calculates contest facts from the frozen snapshot, then submits them here.
-- This function validates the plan again under row locks before changing any CI.

create or replace function private.publish_clash_match_ratings(
  p_match_id text,
  p_algorithm_version text,
  p_facts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_status text;
  v_snapshot_count integer;
  v_fact_count integer;
  v_player_count integer;
  v_bad_count integer;
  v_now timestamptz := now();
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception 'Clash rating publication requires the server rating service.' using errcode = '42501';
  end if;

  if p_match_id is null or btrim(p_match_id) = ''
     or p_algorithm_version is null or btrim(p_algorithm_version) = '' then
    raise exception 'match_id and algorithm_version are required.' using errcode = '22023';
  end if;

  if p_facts is null or jsonb_typeof(p_facts) <> 'array' or jsonb_array_length(p_facts) = 0 then
    raise exception 'At least one contest rating fact is required.' using errcode = '22023';
  end if;

  select status into v_status
  from public.launch_match_results
  where match_id = p_match_id
  for update;

  if v_status is null then
    raise exception 'Matchday result does not exist.' using errcode = '23503';
  end if;
  if v_status <> 'Published' then
    raise exception 'Matchday result must be Published before CI publication.' using errcode = '23514';
  end if;

  if exists (select 1 from public.clash_match_publications where match_id = p_match_id) then
    raise exception 'CI has already been published for this Matchday.' using errcode = '23505';
  end if;

  create temporary table if not exists pg_temp.clash_publish_facts (
    contest_id text,
    player_id text,
    team_id text,
    side text,
    format text,
    outcome text,
    clash_index_before integer,
    opponent_effective_ci numeric,
    win_probability numeric,
    actual_points numeric,
    expected_points numeric,
    performance_vs_expected numeric,
    ci_delta integer
  ) on commit drop;
  truncate pg_temp.clash_publish_facts;

  insert into pg_temp.clash_publish_facts
  select
    x.contest_id, x.player_id, x.team_id, x.side, x.format, x.outcome,
    x.clash_index_before, x.opponent_effective_ci, x.win_probability,
    x.actual_points, x.expected_points, x.performance_vs_expected, x.ci_delta
  from jsonb_to_recordset(p_facts) as x(
    contest_id text, player_id text, team_id text, side text, format text, outcome text,
    clash_index_before integer, opponent_effective_ci numeric, win_probability numeric,
    actual_points numeric, expected_points numeric, performance_vs_expected numeric, ci_delta integer
  );

  select count(*) into v_fact_count from pg_temp.clash_publish_facts;
  if v_fact_count <> jsonb_array_length(p_facts) then
    raise exception 'Rating fact payload could not be parsed completely.' using errcode = '22023';
  end if;

  if exists (select 1 from pg_temp.clash_publish_facts group by contest_id, player_id having count(*) <> 1) then
    raise exception 'Duplicate contest/player rating fact.' using errcode = '23505';
  end if;

  select count(*) into v_bad_count
  from pg_temp.clash_publish_facts f
  left join public.launch_result_contests c on c.id = f.contest_id and c.match_id = p_match_id
  left join public.launch_result_contest_players cp on cp.contest_id = f.contest_id and cp.player_id = f.player_id
  where c.id is null or cp.player_id is null or cp.team_id <> f.team_id or cp.side <> f.side
     or c.format <> f.format
     or (case when f.side = 'Home' then c.home_outcome else c.away_outcome end) <> f.outcome
     or f.win_probability not between 0 and 1 or f.expected_points not between 0 and 1
     or f.actual_points not in (0, 0.5, 1)
     or f.actual_points <> case f.outcome when 'W' then 1 when 'T' then 0.5 when 'L' then 0 end
     or f.performance_vs_expected <> f.actual_points - f.expected_points;
  if v_bad_count > 0 then
    raise exception 'Rating facts do not match the published Matchday result.' using errcode = '23514';
  end if;

  select count(*) into v_bad_count
  from public.launch_result_contests c
  join public.launch_result_contest_players cp on cp.contest_id = c.id
  left join pg_temp.clash_publish_facts f on f.contest_id = c.id and f.player_id = cp.player_id
  where c.match_id = p_match_id and f.player_id is null;
  if v_bad_count > 0 then
    raise exception 'CI publication is missing one or more Matchday participants.' using errcode = '23514';
  end if;

  if exists (
    select 1 from pg_temp.clash_publish_facts f
    left join public.clash_match_rating_snapshots s on s.match_id = p_match_id and s.player_id = f.player_id
    where s.player_id is null or s.algorithm_version <> p_algorithm_version
       or s.clash_index_before <> f.clash_index_before or s.team_id <> f.team_id or s.side <> f.side
  ) then
    raise exception 'Rating facts do not match the frozen Matchday CI snapshot.' using errcode = '23514';
  end if;

  select count(*) into v_snapshot_count
  from public.clash_match_rating_snapshots
  where match_id = p_match_id and algorithm_version = p_algorithm_version;
  select count(distinct player_id) into v_player_count from pg_temp.clash_publish_facts;
  if v_snapshot_count <> v_player_count then
    raise exception 'Frozen snapshot and rated-player counts differ.' using errcode = '23514';
  end if;

  perform 1
  from public.launch_players p
  join (select distinct player_id from pg_temp.clash_publish_facts) f on f.player_id = p.id
  order by p.id
  for update of p;

  if exists (
    select 1
    from (select distinct player_id, clash_index_before from pg_temp.clash_publish_facts) f
    join public.launch_players p on p.id = f.player_id
    where p.clash_index is distinct from f.clash_index_before
  ) then
    raise exception 'A player CI changed after this Matchday snapshot; rebuild before publishing.' using errcode = '40001';
  end if;

  insert into public.clash_contest_rating_facts (
    contest_id, match_id, player_id, team_id, player_name, team_name, side, format,
    outcome, clash_index_before, opponent_effective_ci, win_probability,
    actual_points, expected_points, performance_vs_expected, ci_delta, algorithm_version, calculated_at
  )
  select
    f.contest_id, p_match_id, f.player_id, f.team_id, p.name, t.name, f.side, f.format,
    f.outcome, f.clash_index_before, f.opponent_effective_ci, f.win_probability,
    f.actual_points, f.expected_points, f.performance_vs_expected, f.ci_delta, p_algorithm_version, v_now
  from pg_temp.clash_publish_facts f
  join public.launch_players p on p.id = f.player_id
  join public.launch_teams t on t.id = f.team_id;

  perform set_config('app.clash_rating_engine_write', 'on', true);
  with totals as (
    select player_id, min(clash_index_before) as clash_index_before, sum(ci_delta)::integer as total_delta
    from pg_temp.clash_publish_facts group by player_id
  ), sources as (
    select player_id, ci_source_before
    from public.clash_match_rating_snapshots
    where match_id = p_match_id
  )
  update public.launch_players p
  set clash_index = totals.clash_index_before + totals.total_delta,
      -- A GhostAverage is an averaged starting CI, not a one-match provisional flag.
      -- Publication must not silently decide when the asterisk disappears. A future
      -- explicit qualification rule owns that transition.
      clash_index_provisional = (sources.ci_source_before = 'GhostAverage'),
      updated_at = v_now
  from totals
  join sources on sources.player_id = totals.player_id
  where p.id = totals.player_id;
  perform set_config('app.clash_rating_engine_write', 'off', true);

  insert into public.clash_match_publications (
    match_id, algorithm_version, snapshot_count, fact_count, player_update_count, published_at
  ) values (p_match_id, p_algorithm_version, v_snapshot_count, v_fact_count, v_player_count, v_now);

  return jsonb_build_object(
    'matchId', p_match_id, 'algorithmVersion', p_algorithm_version,
    'facts', v_fact_count, 'playersUpdated', v_player_count, 'publishedAt', v_now
  );
exception when others then
  perform set_config('app.clash_rating_engine_write', 'off', true);
  raise;
end;
$function$;

revoke all on function private.publish_clash_match_ratings(text, text, jsonb) from public;
grant execute on function private.publish_clash_match_ratings(text, text, jsonb) to service_role;

comment on function private.publish_clash_match_ratings(text, text, jsonb) is
  'Atomically validates a complete published Matchday CI plan, persists immutable facts, updates each player once, preserves ghost provenance, and records idempotent publication.';
