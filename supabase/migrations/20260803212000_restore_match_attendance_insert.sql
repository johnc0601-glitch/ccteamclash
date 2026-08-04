create policy "match attendance insert authorized"
on public.launch_match_attendance
for insert
to authenticated
with check (
  private.is_match_editable(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_active_player_for_team(player_id, team_id)
  and updated_by = private.current_launch_profile_id()
  and (
    private.is_launch_player(player_id)
    or private.is_launch_captain_for_team(team_id)
    or private.is_current_commissioner()
  )
);