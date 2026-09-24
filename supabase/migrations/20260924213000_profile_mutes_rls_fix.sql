create or replace function private.current_launch_profile_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
  limit 1
$$;

revoke all on function private.current_launch_profile_id() from public, anon, authenticated;

drop policy if exists "profile mutes own select" on public.launch_profile_mutes;
create policy "profile mutes own select"
on public.launch_profile_mutes
for select
to authenticated
using (muter_profile_id = private.current_launch_profile_id());

drop policy if exists "profile mutes own insert" on public.launch_profile_mutes;
create policy "profile mutes own insert"
on public.launch_profile_mutes
for insert
to authenticated
with check (
  muter_profile_id = private.current_launch_profile_id()
  and muted_profile_id <> muter_profile_id
);

drop policy if exists "profile mutes own delete" on public.launch_profile_mutes;
create policy "profile mutes own delete"
on public.launch_profile_mutes
for delete
to authenticated
using (muter_profile_id = private.current_launch_profile_id());
