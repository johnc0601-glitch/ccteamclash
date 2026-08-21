-- Atomically commit one finalized Clash rating event.
-- Calculation happens in application code; this function validates commissioner
-- access/order and commits event snapshots, per-contest audit rows, and current
-- player ratings together.

create or replace function public.finalize_clash_rating_event(
  p_season_id text,
  p_event_key text,
  p_event_order integer,
  p_event_label text,
  p_algorithm_version text,
  p_rows jsonb,
  p_ledger jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run_id uuid;
  v_last_event_order integer;
  v_row_count integer;
  v_ledger_count integer;
begin
  if not private.is_launch_commissioner() then
    raise exception 'Approved commissioner access is required.' using errcode = '42501';
  end if;

  if p_event_order < 1 then
    raise exception 'Event order must be at least 1.' using errcode = '23514';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Finalization requires at least one player rating row.' using errcode = '23514';
  end if;

  if jsonb_typeof(p_ledger) <> 'array' or jsonb_array_length(p_ledger) = 0 then
    raise exception 'Finalization requires per-contest ledger rows.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.clash_rating_event_players
    where season_id = p_season_id
      and event_key = p_event_key
  ) then
    raise exception 'This event has already been finalized.' using errcode = '23505';
  end if;

  select max(event_order)
    into v_last_event_order
  from public.clash_rating_event_players
  where season_id = p_season_id;

  if v_last_event_order is null then
    if p_event_order <> 1 then
      raise exception 'The first finalized event for a season must be event 1.' using errcode = '23514';
    end if;
  elsif p_event_order <> v_last_event_order + 1 then
    raise exception 'Events must be finalized in order. Last finalized event is %.', v_last_event_order using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.clash_rating_versions where id = p_algorithm_version
  ) then
    raise exception 'Unknown Clash rating algorithm version: %', p_algorithm_version using errcode = '23514';
  end if;

  insert into public.clash_rating_runs (
    season_id,
    algorithm_version,
    starting_event_order,
    source,
    status,
    reason
  ) values (
    p_season_id,
    p_algorithm_version,
    p_event_order,
    'CurrentSeason',
    'Running',
    'Commissioner finalized event ratings'
  )
  returning id into v_run_id;

  insert into public.clash_rating_event_players (
    season_id,
    event_key,
    event_order,
    event_label,
    player_id,
    algorithm_version,
    rating_before,
    singles_delta,
    doubles_delta,
    provisional_adjustment,
    rating_after,
    rated_results_before,
    rated_results_after,
    provisional_events_before,
    provisional_events_after,
    provisional_before,
    provisional_after,
    run_id
  )
  select
    p_season_id,
    p_event_key,
    p_event_order,
    p_event_label,
    row.player_id,
    p_algorithm_version,
    row.rating_before,
    row.singles_delta,
    row.doubles_delta,
    row.provisional_adjustment,
    row.rating_after,
    row.rated_results_before,
    row.rated_results_after,
    row.provisional_events_before,
    row.provisional_events_after,
    row.provisional_before,
    row.provisional_after,
    v_run_id
  from jsonb_to_recordset(p_rows) as row(
    player_id text,
    rating_before double precision,
    singles_delta double precision,
    doubles_delta double precision,
    provisional_adjustment double precision,
    rating_after double precision,
    rated_results_before integer,
    rated_results_after integer,
    provisional_events_before integer,
    provisional_events_after integer,
    provisional_before boolean,
    provisional_after boolean
  );

  get diagnostics v_row_count = row_count;
  if v_row_count <> jsonb_array_length(p_rows) then
    raise exception 'Not all Clash rating rows were written.';
  end if;

  insert into public.clash_rating_ledger (
    season_id,
    event_key,
    event_order,
    event_label,
    source_type,
    source_key,
    source_contest_id,
    player_id,
    format,
    side,
    outcome,
    rating_before,
    partner_player_id,
    partner_rating,
    opponent_one_player_id,
    opponent_one_rating,
    opponent_two_player_id,
    opponent_two_rating,
    own_pair_rating,
    opponent_pair_rating,
    home_adjustment,
    expected_score,
    actual_score,
    competitive_delta,
    provisional_multiplier,
    provisional_adjustment,
    total_delta,
    algorithm_version,
    run_id
  )
  select
    p_season_id,
    p_event_key,
    p_event_order,
    p_event_label,
    'Current',
    row.source_key,
    row.source_contest_id,
    row.player_id,
    row.format,
    row.side,
    row.outcome,
    row.rating_before,
    row.partner_player_id,
    row.partner_rating,
    row.opponent_one_player_id,
    row.opponent_one_rating,
    row.opponent_two_player_id,
    row.opponent_two_rating,
    row.own_pair_rating,
    row.opponent_pair_rating,
    row.home_adjustment,
    row.expected_score,
    row.actual_score,
    row.competitive_delta,
    row.provisional_multiplier,
    row.provisional_adjustment,
    row.total_delta,
    p_algorithm_version,
    v_run_id
  from jsonb_to_recordset(p_ledger) as row(
    source_key text,
    source_contest_id text,
    player_id text,
    format text,
    side text,
    outcome text,
    rating_before double precision,
    partner_player_id text,
    partner_rating double precision,
    opponent_one_player_id text,
    opponent_one_rating double precision,
    opponent_two_player_id text,
    opponent_two_rating double precision,
    own_pair_rating double precision,
    opponent_pair_rating double precision,
    home_adjustment double precision,
    expected_score double precision,
    actual_score double precision,
    competitive_delta double precision,
    provisional_multiplier double precision,
    provisional_adjustment double precision,
    total_delta double precision
  );

  get diagnostics v_ledger_count = row_count;
  if v_ledger_count <> jsonb_array_length(p_ledger) then
    raise exception 'Not all Clash ledger rows were written.';
  end if;

  if exists (
    select 1
    from public.clash_rating_event_players event_player
    left join (
      select player_id, sum(total_delta) as total_delta
      from public.clash_rating_ledger
      where season_id = p_season_id
        and event_key = p_event_key
        and run_id = v_run_id
      group by player_id
    ) ledger_total on ledger_total.player_id = event_player.player_id
    where event_player.season_id = p_season_id
      and event_player.event_key = p_event_key
      and event_player.run_id = v_run_id
      and abs(
        (event_player.rating_after - event_player.rating_before)
        - coalesce(ledger_total.total_delta, 0)
      ) > 0.001
  ) then
    raise exception 'Clash ledger totals do not match event rating movement.';
  end if;

  update public.launch_players as player
  set clash_index = round(row.rating_after)::integer,
      updated_at = now()
  from jsonb_to_recordset(p_rows) as row(
    player_id text,
    rating_after double precision
  )
  where player.id = row.player_id;

  if not found then
    raise exception 'No player Clash Index values were updated.';
  end if;

  update public.clash_rating_runs
  set status = 'Completed',
      rows_written = v_row_count + v_ledger_count,
      completed_at = now()
  where id = v_run_id;

  return v_run_id;
end;
$$;

revoke all on function public.finalize_clash_rating_event(text, text, integer, text, text, jsonb, jsonb) from public;
grant execute on function public.finalize_clash_rating_event(text, text, integer, text, text, jsonb, jsonb) to authenticated;
