-- Keep the public-safe latest movement table synchronized transactionally with
-- finalized event-player rows. This trigger is private and cannot be called via API.

create or replace function private.sync_clash_rating_latest_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create or replace trigger sync_clash_rating_latest_change_after_event_player
  after insert or update of rating_before, rating_after, event_order, event_label
  on public.clash_rating_event_players
  for each row
  execute function private.sync_clash_rating_latest_change();
