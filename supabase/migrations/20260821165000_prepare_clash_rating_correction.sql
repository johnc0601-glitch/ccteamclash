-- Prepare a finalized Clash event for correction without leaving stale ratings.
-- The selected event and all later rating outputs are invalidated atomically,
-- affected players are restored to their last valid rating state, and normal
-- result editing becomes available again for the invalidated events.

alter table public.clash_rating_runs
  drop constraint if exists clash_rating_runs_status_check;

alter table public.clash_rating_runs
  add constraint clash_rating_runs_status_check
  check (status in ('Running', 'Completed', 'Failed', 'Invalidated'));

create or replace function public.prepare_clash_rating_correction(p_event_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season_id text;
  v_event_order integer;
  v_algorithm_version text;
  v_invalidated_events integer;
  v_invalidated_player_rows integer;
  v_affected_players integer;
begin
  if not private.is_launch_commissioner() then
    raise exception 'Approved commissioner access is required.' using errcode = '42501';
  end if;

  select event_player.season_id,
         event_player.event_order,
         event_player.algorithm_version
    into v_season_id, v_event_order, v_algorithm_version
  from public.clash_rating_event_players as event_player
  where event_player.event_key = p_event_key
  order by event_player.calculated_at desc
  limit 1;

  if v_season_id is null then
    raise exception 'That Clash rating event is not finalized.' using errcode = 'P0002';
  end if;

  select count(distinct event_key), count(*), count(distinct player_id)
    into v_invalidated_events, v_invalidated_player_rows, v_affected_players
  from public.clash_rating_event_players
  where season_id = v_season_id
    and event_order >= v_event_order;

  perform set_config('app.clash_rating_engine_write', 'on', true);
  perform set_config('app.clash_rating_correction_write', 'on', true);

  with impacted as (
    select distinct event_player.player_id
    from public.clash_rating_event_players as event_player
    where event_player.season_id = v_season_id
      and event_player.event_order >= v_event_order
  ), restore as (
    select impacted.player_id,
      coalesce(
        (
          select prior.rating_after
          from public.clash_rating_event_players as prior
          where prior.season_id = v_season_id
            and prior.player_id = impacted.player_id
            and prior.event_order < v_event_order
          order by prior.event_order desc, prior.calculated_at desc
          limit 1
        ),
        (
          select season_start.rating
          from public.clash_rating_season_starts as season_start
          where season_start.season_id = v_season_id
            and season_start.player_id = impacted.player_id
            and season_start.algorithm_version = v_algorithm_version
          limit 1
        ),
        (
          select first_invalidated.rating_before
          from public.clash_rating_event_players as first_invalidated
          where first_invalidated.season_id = v_season_id
            and first_invalidated.player_id = impacted.player_id
            and first_invalidated.event_order >= v_event_order
          order by first_invalidated.event_order asc, first_invalidated.calculated_at asc
          limit 1
        )
      ) as rating
    from impacted
  )
  update public.launch_players as player
  set clash_index = round(restore.rating)::integer,
      updated_at = now()
  from restore
  where player.id = restore.player_id
    and restore.rating is not null;

  update public.clash_rating_runs
  set status = 'Invalidated',
      reason = concat_ws(' · ', nullif(reason, ''), 'Invalidated for result correction'),
      completed_at = coalesce(completed_at, now())
  where season_id = v_season_id
    and starting_event_order >= v_event_order
    and status = 'Completed';

  delete from public.clash_rating_ledger
  where season_id = v_season_id
    and event_order >= v_event_order;

  delete from public.clash_rating_event_players
  where season_id = v_season_id
    and event_order >= v_event_order;

  perform set_config('app.clash_rating_correction_write', 'off', true);
  perform set_config('app.clash_rating_engine_write', 'off', true);

  return jsonb_build_object(
    'seasonId', v_season_id,
    'startingEventOrder', v_event_order,
    'invalidatedEvents', v_invalidated_events,
    'invalidatedPlayerRows', v_invalidated_player_rows,
    'affectedPlayers', v_affected_players
  );
end;
$$;

revoke all on function public.prepare_clash_rating_correction(text) from public;
grant execute on function public.prepare_clash_rating_correction(text) to authenticated;
