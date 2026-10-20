-- A dedicated, revocable podcast-only permission for Phil Murray (Philip Murray).
-- Does not grant Commissioner, captain, Matchday, or story editorial access.
create table if not exists public.clash_cast_editors (
  profile_id text primary key references public.launch_profiles(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.clash_cast_editors enable row level security;
revoke all on public.clash_cast_editors from anon, authenticated;
grant select on public.clash_cast_editors to authenticated;

drop policy if exists "approved editors read own clash cast grant" on public.clash_cast_editors;
create policy "approved editors read own clash cast grant" on public.clash_cast_editors
for select to authenticated using (exists (
  select 1 from public.launch_profiles p
  where p.id=profile_id and p.user_id=(select auth.uid()) and p.status='Approved'
));

drop policy if exists "approved clash cast editors update podcast status" on public.launch_podcast_status;
create policy "approved clash cast editors update podcast status" on public.launch_podcast_status
for update to authenticated using (exists (
  select 1 from public.clash_cast_editors e
  join public.launch_profiles p on p.id=e.profile_id
  where p.user_id=(select auth.uid()) and p.status='Approved'
)) with check (exists (
  select 1 from public.clash_cast_editors e
  join public.launch_profiles p on p.id=e.profile_id
  where p.user_id=(select auth.uid()) and p.status='Approved'
));

do $$
declare approved_count integer;
begin
  select count(*) into approved_count
  from public.launch_profiles where display_name='Philip Murray'
    and user_id is not null and status='Approved';
  if approved_count > 1 then
    raise exception 'Ambiguous Philip Murray profile; no podcast grant applied.';
  end if;
  if approved_count = 1 then
    insert into public.clash_cast_editors(profile_id)
    select id from public.launch_profiles where display_name='Philip Murray'
      and user_id is not null and status='Approved'
    on conflict(profile_id) do nothing;
  end if;
end $$;
