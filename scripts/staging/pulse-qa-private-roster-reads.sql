-- STAGING ONLY. Approved commissioners may read the isolated public-data QA copies.
-- No grants, public policy changes, real-season changes, or write access.
create policy "commissioners read pulse QA roster manifests"
on public.launch_match_roster_snapshots for select to authenticated
using (match_id like 'pulse-qa-%' and (select private.is_launch_commissioner()));
create policy "commissioners read pulse QA roster players"
on public.launch_match_roster_snapshot_players for select to authenticated
using (match_id like 'pulse-qa-%' and (select private.is_launch_commissioner()));
