-- Keep detailed Clash rating data private even at the table-grant layer.
-- RLS remains the second layer; public rankings use only the narrow view.

revoke all on table public.clash_rating_versions from anon;
revoke all on table public.clash_rating_runs from anon;
revoke all on table public.clash_rating_event_players from anon;
revoke all on table public.clash_rating_ledger from anon;
revoke all on table public.clash_rating_historical_seeds from anon;
revoke all on table public.clash_rating_season_snapshots from anon;

revoke all on table public.clash_rating_versions from public;
revoke all on table public.clash_rating_runs from public;
revoke all on table public.clash_rating_event_players from public;
revoke all on table public.clash_rating_ledger from public;
revoke all on table public.clash_rating_historical_seeds from public;
revoke all on table public.clash_rating_season_snapshots from public;

grant select, insert, update, delete on table public.clash_rating_versions to authenticated;
grant select, insert, update, delete on table public.clash_rating_runs to authenticated;
grant select, insert, update, delete on table public.clash_rating_event_players to authenticated;
grant select, insert, update, delete on table public.clash_rating_ledger to authenticated;
grant select, insert, update, delete on table public.clash_rating_historical_seeds to authenticated;
grant select, insert, update, delete on table public.clash_rating_season_snapshots to authenticated;

grant select on table public.clash_rating_latest_changes to anon, authenticated;
