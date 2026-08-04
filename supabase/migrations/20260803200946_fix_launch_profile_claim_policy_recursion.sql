drop policy if exists "launch captains read claim profiles"
on public.launch_profiles;

drop policy if exists "launch captains approve claim profiles"
on public.launch_profiles;


create or replace function private.can_launch_captain_review_profile(target_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public, private
set row_security = off
as $$
  select exists (
    select 1
    from public.launch_player_claims claim
    where claim.profile_id = target_profile_id
      and claim.status = 'Pending'
      and claim.requested_player_id is not null
      and private.is_launch_captain_for_player(claim.requested_player_id)
  );
$$;


revoke all on function private.can_launch_captain_review_profile(text)
from public, anon;

grant execute on function private.can_launch_captain_review_profile(text)
to authenticated;


create policy "launch captains read claim profiles"
on public.launch_profiles
for select
to authenticated
using (
  private.can_launch_captain_review_profile(id)
);


create policy "launch captains approve claim profiles"
on public.launch_profiles
for update
to authenticated
using (
  private.can_launch_captain_review_profile(id)
)
with check (
  status = 'Approved'
  and role = 'Player'
  and player_id is not null
  and captain_team_id is null
  and private.is_launch_captain_for_player(player_id)
);