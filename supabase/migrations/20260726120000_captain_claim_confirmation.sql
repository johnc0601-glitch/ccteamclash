create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.is_launch_captain_for_team(team_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.status = 'Approved'
      and (
        profile.role = 'Commissioner'
        or (
          profile.role = 'Captain'
          and profile.captain_team_id = team_id
        )
      )
  );
$$;

revoke all on function private.is_launch_captain_for_team(text) from public;
revoke all on function private.is_launch_captain_for_team(text) from anon;
grant execute on function private.is_launch_captain_for_team(text) to authenticated;

create or replace function private.is_launch_captain_for_player(player_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.launch_players player
    where player.id = player_id
      and player.current_team_id is not null
      and private.is_launch_captain_for_team(player.current_team_id)
  );
$$;

revoke all on function private.is_launch_captain_for_player(text) from public;
revoke all on function private.is_launch_captain_for_player(text) from anon;
grant execute on function private.is_launch_captain_for_player(text) to authenticated;

drop policy if exists "launch captains read team claims" on public.launch_player_claims;
create policy "launch captains read team claims"
on public.launch_player_claims
for select
to authenticated
using (
  status = 'Pending'
  and requested_player_id is not null
  and private.is_launch_captain_for_player(requested_player_id)
);

drop policy if exists "launch captains confirm team claims" on public.launch_player_claims;
create policy "launch captains confirm team claims"
on public.launch_player_claims
for update
to authenticated
using (
  status = 'Pending'
  and requested_player_id is not null
  and private.is_launch_captain_for_player(requested_player_id)
)
with check (
  status in ('Approved', 'Rejected')
  and requested_player_id is not null
  and private.is_launch_captain_for_player(requested_player_id)
);

drop policy if exists "launch captains read claim profiles" on public.launch_profiles;
create policy "launch captains read claim profiles"
on public.launch_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.launch_player_claims claim
    where claim.profile_id = launch_profiles.id
      and claim.status = 'Pending'
      and claim.requested_player_id is not null
      and private.is_launch_captain_for_player(claim.requested_player_id)
  )
);

drop policy if exists "launch captains approve claim profiles" on public.launch_profiles;
create policy "launch captains approve claim profiles"
on public.launch_profiles
for update
to authenticated
using (
  status = 'Pending'
  and exists (
    select 1
    from public.launch_player_claims claim
    where claim.profile_id = launch_profiles.id
      and claim.status = 'Pending'
      and claim.requested_player_id is not null
      and private.is_launch_captain_for_player(claim.requested_player_id)
  )
)
with check (
  status = 'Approved'
  and role = 'Player'
  and player_id is not null
  and captain_team_id is null
  and private.is_launch_captain_for_player(player_id)
);
