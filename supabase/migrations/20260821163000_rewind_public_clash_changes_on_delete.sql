-- Make the public-safe latest movement table correction-safe.
-- If an event-player row is deleted during a correction rebuild, expose the
-- player's previous valid event movement instead of leaving stale +/- data.

create or replace function private.sync_clash_rating_latest_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest public.clash_rating_event_players%rowtype;
begin
  if tg_op = 'DELETE' then
    select event_player.*
      into v_latest
    from public.clash_rating_event_players as event_player
    where event_player.season_id = old.season_id
      and event_player.player_id = old.player_id
    order by event_player.event_order desc, event_player.calculated_at desc
    limit 1;

    if v_latest.player_id is null then
      delete from public.clash_rating_latest_changes
      where season_id = old.season_id
        and player_id = old.player_id;
    else
      insert into public.clash_rating_latest_changes (
        season_id,
        player_id,
        event_order,
        event_label,
        rating_change,
        updated_at
      ) values (
        v_latest.season_id,
        v_latest.player_id,
        v_latest.event_order,
        v_latest.event_label,
        round(v_latest.rating_after - v_latest.rating_before)::integer,
        now()
      )
      on conflict (season_id, player_id) do update
      set event_order = excluded.event_order,
          event_label = excluded.event_label,
          rating_change = excluded.rating_change,
          updated_at = excluded.updated_at;
    end if;

    return old;
  end if;

  insert into public.clash_rating_latest_changes (
    season_id,
    player_id,
    event_order,
    event_label,
    rating_change,
    updated_at
  ) values (
    new.season_id,
    new.player_id,
    new.event_order,
    new.event_label,
    round(new.rating_after - new.rating_before)::integer,
    now()
  )
  on conflict (season_id, player_id) do update
  set event_order = excluded.event_order,
      event_label = excluded.event_label,
      rating_change = excluded.rating_change,
      updated_at = excluded.updated_at
  where excluded.event_order >= public.clash_rating_latest_changes.event_order;

  return new;
end;
$$;

revoke all on function private.sync_clash_rating_latest_change() from public;

drop trigger if exists sync_clash_rating_latest_change_after_event_player
  on public.clash_rating_event_players;
create trigger sync_clash_rating_latest_change_after_event_player
  after insert or update of rating_before, rating_after, event_order, event_label or delete
  on public.clash_rating_event_players
  for each row
  execute function private.sync_clash_rating_latest_change();
