create or replace function private.current_launch_profile_id()
returns text
language sql
stable
security definer
set search_path = public, private
set row_security = off
as $$
  select profile.id
  from public.launch_profiles profile
  where profile.user_id = auth.uid()
    and profile.status = 'Approved'
  limit 1;
$$;


create or replace function private.is_launch_commissioner()
returns boolean
language sql
security definer
set search_path = public, private
set row_security = off
as $$
  select exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = auth.uid()
      and profile.role = 'Commissioner'
      and profile.status = 'Approved'
  );
$$;


create or replace function private.is_launch_player(player_id text)
returns boolean
language sql
security definer
set search_path = public, private
set row_security = off
as $$
  select exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = auth.uid()
      and profile.player_id = is_launch_player.player_id
      and profile.status = 'Approved'
      and profile.role = 'Player'
  );
$$;


create or replace function private.is_launch_captain_for_team(team_id text)
returns boolean
language sql
security definer
set search_path = public, private
set row_security = off
as $$
  select exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = auth.uid()
      and profile.status = 'Approved'
      and profile.role = 'Captain'
      and profile.captain_team_id = team_id
  );
$$;