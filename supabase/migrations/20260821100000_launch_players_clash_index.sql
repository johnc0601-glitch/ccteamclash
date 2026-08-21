-- Persist the current display/cache value for each player's Clash Index.
-- Official historical values remain reconstructable from rating snapshots/ledger.

alter table public.launch_players
  add column if not exists clash_index integer;
