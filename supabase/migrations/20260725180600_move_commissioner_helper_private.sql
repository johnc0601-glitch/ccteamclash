create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.is_launch_commissioner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.launch_profiles
    where user_id = (select auth.uid())
      and role = 'Commissioner'
      and status = 'Approved'
  );
$$;

revoke all on function private.is_launch_commissioner() from public;
revoke all on function private.is_launch_commissioner() from anon;
grant execute on function private.is_launch_commissioner() to authenticated;

drop policy if exists "launch commissioners read profiles" on public.launch_profiles;
create policy "launch commissioners read profiles"
on public.launch_profiles
for select
to authenticated
using (private.is_launch_commissioner());

drop policy if exists "launch commissioners update profiles" on public.launch_profiles;
create policy "launch commissioners update profiles"
on public.launch_profiles
for update
to authenticated
using (private.is_launch_commissioner())
with check (private.is_launch_commissioner());

drop policy if exists "launch commissioners read claims" on public.launch_player_claims;
create policy "launch commissioners read claims"
on public.launch_player_claims
for select
to authenticated
using (private.is_launch_commissioner());

drop policy if exists "launch commissioners update claims" on public.launch_player_claims;
create policy "launch commissioners update claims"
on public.launch_player_claims
for update
to authenticated
using (private.is_launch_commissioner())
with check (private.is_launch_commissioner());

drop function if exists public.is_launch_commissioner();
