create or replace function private.protect_launch_profile_access_fields()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if not private.is_launch_commissioner() then
    if new.user_id is distinct from old.user_id
      or new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.player_id is distinct from old.player_id
      or new.captain_team_id is distinct from old.captain_team_id
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Only the profile display name can be changed here.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_launch_profile_access_fields() from public;
revoke all on function private.protect_launch_profile_access_fields() from anon;
revoke all on function private.protect_launch_profile_access_fields() from authenticated;

drop trigger if exists protect_launch_profile_access_fields on public.launch_profiles;
create trigger protect_launch_profile_access_fields
before update on public.launch_profiles
for each row
execute function private.protect_launch_profile_access_fields();

drop policy if exists "launch users update own profile name" on public.launch_profiles;
create policy "launch users update own profile name"
on public.launch_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function private.protect_launch_player_league_fields()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if not private.is_launch_commissioner() then
    if new.id is distinct from old.id
      or new.gender is distinct from old.gender
      or new.pdga_number is distinct from old.pdga_number
      or new.pdga_rating is distinct from old.pdga_rating
      or new.current_team_id is distinct from old.current_team_id
      or new.home_area is distinct from old.home_area
      or new.active is distinct from old.active
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Only the linked player name can be changed here.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_launch_player_league_fields() from public;
revoke all on function private.protect_launch_player_league_fields() from anon;
revoke all on function private.protect_launch_player_league_fields() from authenticated;

drop trigger if exists protect_launch_player_league_fields on public.launch_players;
create trigger protect_launch_player_league_fields
before update on public.launch_players
for each row
execute function private.protect_launch_player_league_fields();

drop policy if exists "launch users update own linked player name" on public.launch_players;
create policy "launch users update own linked player name"
on public.launch_players
for update
to authenticated
using (
  exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.player_id = launch_players.id
  )
)
with check (
  exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.player_id = launch_players.id
  )
);
