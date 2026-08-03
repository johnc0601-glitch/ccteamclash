create or replace function private.authorize_launch_match_attendance_delete(
  match_id text,
  team_id text,
  player_id text,
  updated_by text
)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not private.is_launch_match_published(match_id)
    or not private.is_launch_match_attendance_open(match_id)
  then
    raise exception 'Match attendance cannot be deleted.' using errcode = '42501';
  end if;

  if (
    private.is_launch_player(player_id)
    and updated_by = private.current_launch_profile_id()
  )
    or private.is_launch_captain_for_team(team_id)
    or private.is_launch_commissioner()
  then
    return true;
  end if;

  raise exception 'Match attendance cannot be deleted.' using errcode = '42501';
end;
$$;

revoke all on function private.authorize_launch_match_attendance_delete(text, text, text, text)
from public, anon, authenticated;
grant execute on function private.authorize_launch_match_attendance_delete(text, text, text, text)
to authenticated;

drop policy if exists "match attendance update authorized"
on public.launch_match_attendance;

create policy "match attendance update authorized"
on public.launch_match_attendance
for update
to authenticated
using (
  private.is_launch_match_published(match_id)
  and private.current_launch_profile_id() is not null
)
with check (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and private.is_launch_active_player_for_team(player_id, team_id)
  and updated_by = private.current_launch_profile_id()
  and (
    (
      private.is_launch_player(player_id)
      and updated_by = private.current_launch_profile_id()
    )
    or private.is_launch_captain_for_team(team_id)
    or private.is_launch_commissioner()
  )
);

drop policy if exists "match attendance delete authorized"
on public.launch_match_attendance;

create policy "match attendance delete authorized"
on public.launch_match_attendance
for delete
to authenticated
using (
  private.authorize_launch_match_attendance_delete(
    match_id,
    team_id,
    player_id,
    updated_by
  )
);

drop policy if exists "captains commissioners update rosters"
on public.launch_match_rosters;

create policy "captains commissioners update rosters"
on public.launch_match_rosters
for update
to authenticated
using (
  private.is_launch_match_published(match_id)
  and private.current_launch_profile_id() is not null
)
with check (
  private.is_launch_match_published(match_id)
  and private.is_launch_match_attendance_open(match_id)
  and private.is_launch_match_team(match_id, team_id)
  and (
    private.is_launch_captain_for_team(team_id)
    or private.is_launch_commissioner()
  )
  and (
    (status = 'Draft' and confirmed_by is null and confirmed_at is null)
    or (
      status = 'Confirmed'
      and confirmed_by = private.current_launch_profile_id()
      and confirmed_at is not null
    )
  )
);
