create policy "captains commissioners create rosters"
on public.launch_match_rosters
for insert
to authenticated
with check (
  private.is_match_editable(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and (
    private.is_current_captain_for_team(team_id)
    or private.is_current_commissioner()
  )
  and confirmed_by = private.current_launch_profile_id()
);


create policy "captains commissioners update rosters"
on public.launch_match_rosters
for update
to authenticated
using (
  private.is_match_editable(match_id)
  and (
    private.is_current_captain_for_team(team_id)
    or private.is_current_commissioner()
  )
)
with check (
  private.is_launch_match_team(match_id, team_id)
  and confirmed_by = private.current_launch_profile_id()
);