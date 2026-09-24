-- Private member mutes for social content only.
-- Official roster, CI, results, and history remain unaffected.

create table if not exists public.launch_profile_mutes (
  muter_profile_id text not null references public.launch_profiles(id) on delete cascade,
  muted_profile_id text not null references public.launch_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_profile_id, muted_profile_id),
  constraint launch_profile_mutes_not_self check (muter_profile_id <> muted_profile_id)
);

create index if not exists launch_profile_mutes_muted_idx
  on public.launch_profile_mutes(muted_profile_id);

alter table public.launch_profile_mutes enable row level security;

drop policy if exists "profile mutes own select" on public.launch_profile_mutes;
create policy "profile mutes own select"
on public.launch_profile_mutes
for select
to authenticated
using (
  exists (
    select 1
    from public.launch_profiles profile
    where profile.id = muter_profile_id
      and profile.user_id = (select auth.uid())
      and profile.status = 'Approved'
  )
);

drop policy if exists "profile mutes own insert" on public.launch_profile_mutes;
create policy "profile mutes own insert"
on public.launch_profile_mutes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.launch_profiles profile
    where profile.id = muter_profile_id
      and profile.user_id = (select auth.uid())
      and profile.status = 'Approved'
  )
  and exists (
    select 1
    from public.launch_profiles target
    where target.id = muted_profile_id
      and target.id <> muter_profile_id
  )
);

drop policy if exists "profile mutes own delete" on public.launch_profile_mutes;
create policy "profile mutes own delete"
on public.launch_profile_mutes
for delete
to authenticated
using (
  exists (
    select 1
    from public.launch_profiles profile
    where profile.id = muter_profile_id
      and profile.user_id = (select auth.uid())
  )
);

grant select, insert, delete on public.launch_profile_mutes to authenticated;

create or replace function private.cleanup_profile_mutes_after_account_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.account_deleted_at is null and new.account_deleted_at is not null then
    delete from public.launch_profile_mutes
    where muter_profile_id = new.id
       or muted_profile_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists cleanup_profile_mutes_after_account_delete on public.launch_profiles;
create trigger cleanup_profile_mutes_after_account_delete
after update of account_deleted_at on public.launch_profiles
for each row execute function private.cleanup_profile_mutes_after_account_delete();

comment on table public.launch_profile_mutes is
  'Private social-content mutes. Does not hide official league records.';
