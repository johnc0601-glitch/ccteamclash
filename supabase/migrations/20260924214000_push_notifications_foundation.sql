-- Web Push device subscriptions and member notification preferences.

create table if not exists public.launch_notification_preferences (
  profile_id text primary key references public.launch_profiles(id) on delete cascade,
  match_reminders boolean not null default true,
  roster_deadline boolean not null default true,
  matchday_open boolean not null default true,
  results_ci boolean not null default true,
  captain_announcements boolean not null default true,
  league_stories boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.launch_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.launch_profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists launch_push_subscriptions_profile_idx
  on public.launch_push_subscriptions(profile_id, enabled);

alter table public.launch_notification_preferences enable row level security;
alter table public.launch_push_subscriptions enable row level security;

drop policy if exists "notification preferences own select" on public.launch_notification_preferences;
create policy "notification preferences own select"
on public.launch_notification_preferences
for select to authenticated
using (profile_id = private.current_launch_profile_id());

drop policy if exists "notification preferences own insert" on public.launch_notification_preferences;
create policy "notification preferences own insert"
on public.launch_notification_preferences
for insert to authenticated
with check (profile_id = private.current_launch_profile_id());

drop policy if exists "notification preferences own update" on public.launch_notification_preferences;
create policy "notification preferences own update"
on public.launch_notification_preferences
for update to authenticated
using (profile_id = private.current_launch_profile_id())
with check (profile_id = private.current_launch_profile_id());

drop policy if exists "push subscriptions own select" on public.launch_push_subscriptions;
create policy "push subscriptions own select"
on public.launch_push_subscriptions
for select to authenticated
using (profile_id = private.current_launch_profile_id());

drop policy if exists "push subscriptions own insert" on public.launch_push_subscriptions;
create policy "push subscriptions own insert"
on public.launch_push_subscriptions
for insert to authenticated
with check (profile_id = private.current_launch_profile_id());

drop policy if exists "push subscriptions own update" on public.launch_push_subscriptions;
create policy "push subscriptions own update"
on public.launch_push_subscriptions
for update to authenticated
using (profile_id = private.current_launch_profile_id())
with check (profile_id = private.current_launch_profile_id());

drop policy if exists "push subscriptions own delete" on public.launch_push_subscriptions;
create policy "push subscriptions own delete"
on public.launch_push_subscriptions
for delete to authenticated
using (profile_id = private.current_launch_profile_id());

grant select, insert, update on public.launch_notification_preferences to authenticated;
grant select, insert, update, delete on public.launch_push_subscriptions to authenticated;

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

    delete from public.launch_push_subscriptions
    where profile_id = new.id;

    delete from public.launch_notification_preferences
    where profile_id = new.id;
  end if;
  return new;
end;
$$;

comment on table public.launch_push_subscriptions is
  'Browser Web Push subscriptions owned by an authenticated Team Clash profile.';
comment on table public.launch_notification_preferences is
  'Per-profile opt-in preferences for useful league notification categories.';
