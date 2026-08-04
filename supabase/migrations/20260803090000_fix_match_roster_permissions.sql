-- Fix match roster permissions
-- Adds missing commissioner permissions and tightens player/captain checks

drop policy if exists "authorized users update pre-lock match attendance" on public.launch_match_attendance;
drop policy if exists "authorized users delete pre-lock match attendance" on public.launch_match_attendance;

create policy "authorized users update pre-lock match attendance"
on public.launch_match_attendance
for update
to authenticated
using (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and (
    (
      private.is_launch_player(player_id)
      and updated_by = (select private.current_launch_profile_id())
    )
    or private.is_launch_captain_for_team(team_id)
    or exists (
      select 1 from public.launch_profiles p
      where p.id = private.current_launch_profile_id()
      and p.role = 'Commissioner'
    )
  )
)
with check (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_active_player_for_team(player_id, team_id)
  and updated_by = (select private.current_launch_profile_id())
);

create policy "authorized users delete pre-lock match attendance"
on public.launch_match_attendance
for delete
to authenticated
using (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and (
    private.is_launch_player(player_id)
    or private.is_launch_captain_for_team(team_id)
    or exists (
      select 1 from public.launch_profiles p
      where p.id = private.current_launch_profile_id()
      and p.role = 'Commissioner'
    )
  )
);

drop policy if exists "captains manage pre-lock match rosters" on public.launch_match_rosters;
drop policy if exists "captains update pre-lock match rosters" on public.launch_match_rosters;

create policy "captains and commissioners manage pre-lock match rosters"
on public.launch_match_rosters
for insert
to authenticated
with check (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and private.is_launch_match_team(match_id, team_id)
  and (
    private.is_launch_captain_for_team(team_id)
    or exists (
      select 1 from public.launch_profiles p
      where p.id = private.current_launch_profile_id()
      and p.role = 'Commissioner'
    )
  )
  and confirmed_by = (select private.current_launch_profile_id())
);

create policy "captains and commissioners update pre-lock match rosters"
on public.launch_match_rosters
for update
to authenticated
using (
  (select private.is_launch_match_published(match_id))
  and (select private.is_launch_match_attendance_open(match_id))
  and (
    private.is_launch_captain_for_team(team_id)
    or exists (
      select 1 from public.launch_profiles p
      where p.id = private.current_launch_profile_id()
      and p.role = 'Commissioner'
    )
  )
)
with check (
  private.is_launch_match_team(match_id, team_id)
  and confirmed_by = (select private.current_launch_profile_id())
);
