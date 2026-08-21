-- Public, read-only Clash Index movement for rankings.
-- Keep the underlying rating ledger and event snapshots commissioner-only.

create or replace view public.clash_rating_latest_changes
with (security_barrier = true)
as
select distinct on (event_players.season_id, event_players.player_id)
  event_players.season_id,
  event_players.player_id,
  event_players.event_order,
  event_players.event_label,
  round(event_players.rating_after - event_players.rating_before)::integer as rating_change
from public.clash_rating_event_players as event_players
join public.launch_seasons as seasons on seasons.id = event_players.season_id
where seasons.published = true
order by event_players.season_id, event_players.player_id, event_players.event_order desc;

revoke all on public.clash_rating_latest_changes from public;
grant select on public.clash_rating_latest_changes to anon, authenticated;
