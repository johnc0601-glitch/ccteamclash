-- Read-only access to the sources required for verified, finalized Clash Pulse
-- story and streak calculations. Only individually-approved Pulse readers,
-- only published seasons and matches. No roster, CI or commissioner mutation grants.
-- This intentionally does not grant direct access to unpublished match predictions.

drop policy if exists "pulse readers see finalized clash_match_rating_snapshots" on public.clash_match_rating_snapshots;
create policy "pulse readers see finalized clash_match_rating_snapshots"
  on public.clash_match_rating_snapshots for select to authenticated
  using (
    exists (
      select 1
      from public.clash_pulse_readers r
      join public.launch_profiles p on p.id = r.profile_id
      where p.user_id = (select auth.uid()) and p.status = 'Approved'
    )
    and exists (
      select 1
      from public.launch_match_results final
      join public.launch_schedule_matches m on m.id = final.match_id
      join public.launch_seasons s on s.id = m.season_id
      where final.match_id = clash_match_rating_snapshots.match_id
        and final.status = 'Published'
        and s.published = true
    )
  );


drop policy if exists "pulse readers see finalized team_strength_prediction_snapshots" on public.team_strength_prediction_snapshots;
create policy "pulse readers see finalized team_strength_prediction_snapshots"
  on public.team_strength_prediction_snapshots for select to authenticated
  using (
    exists (
      select 1
      from public.clash_pulse_readers r
      join public.launch_profiles p on p.id = r.profile_id
      where p.user_id = (select auth.uid()) and p.status = 'Approved'
    )
    and exists (
      select 1
      from public.launch_match_results final
      join public.launch_schedule_matches m on m.id = final.match_id
      join public.launch_seasons s on s.id = m.season_id
      where final.match_id = team_strength_prediction_snapshots.match_id
        and final.status = 'Published'
        and s.published = true
    )
  );


drop policy if exists "pulse readers see finalized launch_match_structural_points" on public.launch_match_structural_points;
create policy "pulse readers see finalized launch_match_structural_points"
  on public.launch_match_structural_points for select to authenticated
  using (
    exists (
      select 1
      from public.clash_pulse_readers r
      join public.launch_profiles p on p.id = r.profile_id
      where p.user_id = (select auth.uid()) and p.status = 'Approved'
    )
    and exists (
      select 1
      from public.launch_match_results final
      join public.launch_schedule_matches m on m.id = final.match_id
      join public.launch_seasons s on s.id = m.season_id
      where final.match_id = launch_match_structural_points.match_id
        and final.status = 'Published'
        and s.published = true
    )
  );
