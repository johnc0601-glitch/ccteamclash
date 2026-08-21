-- Track rating events invalidated by a correction so they can be rebuilt
-- automatically, in order, after the corrected result is republished.

create table if not exists public.clash_rating_rebuild_queue (
  id uuid primary key default gen_random_uuid(),
  correction_id uuid not null,
  season_id text not null references public.launch_seasons(id) on delete cascade,
  event_key text not null,
  event_order integer not null,
  event_label text not null,
  algorithm_version text not null references public.clash_rating_versions(id),
  status text not null default 'Pending' check (status in ('Pending', 'Rebuilt', 'Failed')),
  run_id uuid references public.clash_rating_runs(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  rebuilt_at timestamptz,
  unique (correction_id, event_key)
);

create index if not exists clash_rating_rebuild_queue_pending_idx
  on public.clash_rating_rebuild_queue (season_id, event_order)
  where status = 'Pending';

alter table public.clash_rating_rebuild_queue enable row level security;

do $$ begin
  create policy "Commissioners manage Clash rebuild queue"
    on public.clash_rating_rebuild_queue for all to authenticated
    using (private.is_launch_commissioner())
    with check (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;

revoke all on public.clash_rating_rebuild_queue from anon;
grant select, insert, update, delete on public.clash_rating_rebuild_queue to authenticated;

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
  v_correction_id uuid := gen_random_uuid();
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

  insert into public.clash_rating_rebuild_queue (
    correction_id,
    season_id,
    event_key,
    event_order,
    event_label,
    algorithm_version,
    status
  )
  select distinct
    v_correction_id,
    event_player.season_id,
    event_player.event_key,
    event_player.event_order,
    event_player.event_label,
    event_player.algorithm_version,
    'Pending'
  from public.clash_rating_event_players as event_player
  where event_player.season_id = v_season_id
    and event_player.event_order >= v_event_order
  order by event_player.event_order;

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
    'correctionId', v_correction_id,
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
