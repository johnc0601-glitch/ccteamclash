-- Atomically commit one finalized Clash rating event.
-- Calculation happens in application code; this function validates commissioner
-- access/order and commits event snapshots + current player ratings together.

create or replace function private.finalize_clash_rating_event(
  p_season_id text,
  p_event_key text,
  p_event_order integer,
  p_event_label text,
  p_algorithm_version text,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_run_id uuid;
  v_last_event_order integer;
  v_row_count integer;
begin
  if not private.is_launch_commissioner() then
    raise exception 'Approved commissioner access is required.';
  end if;

  if p_event_order < 1 then
    raise exception 'Event order must be at least 1.';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Finalization requires at least one player rating row.';
  end if;

  if exists (
    select 1
    from public.clash_rating_event_players
    where season_id = p_season_id
      and event_key = p_event_key
  ) then
    raise exception 'This event has already been finalized.';
  end if;

  select max(event_order)
    into v_last_event_order
  from public.clash_rating_event_players
  where season_id = p_season_id;

  if v_last_event_order is null then
    if p_event_order <> 1 then
      raise exception 'The first finalized event for a season must be event 1.';
    end if;
  elsif p_event_order <> v_last_event_order + 1 then
    raise exception 'Events must be finalized in order. Last finalized event is %.', v_last_event_order;
  end if;

  if not exists (
    select 1 from public.clash_rating_versions where id = p_algorithm_version
  ) then
    raise exception 'Unknown Clash rating algorithm version: %', p_algorithm_version;
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
      rows_written = v_row_count,
      completed_at = now()
  where id = v_run_id;

  return v_run_id;
end;
$$;

revoke all on function private.finalize_clash_rating_event(text, text, integer, text, text, jsonb) from public;
grant execute on function private.finalize_clash_rating_event(text, text, integer, text, text, jsonb) to authenticated;
