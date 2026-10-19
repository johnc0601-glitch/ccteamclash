-- Dedicated, revocable, read-only access to the Clash Pulse fact library.
-- Apply after 20261018151349_clash_pulse_fact_library.sql.
-- Nothing in this migration changes match results, CI, rosters, or commissioner roles.
create table if not exists public.clash_pulse_readers (
  profile_id text primary key references public.launch_profiles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id)
);

alter table public.clash_pulse_readers enable row level security;
revoke all on public.clash_pulse_readers from anon, authenticated;
grant select, insert, delete on public.clash_pulse_readers to authenticated;

drop policy if exists "read own pulse reader grant or commissioner" on public.clash_pulse_readers;
create policy "read own pulse reader grant or commissioner"
  on public.clash_pulse_readers for select to authenticated
  using (
    (select private.is_launch_commissioner()) or exists (
      select 1 from public.launch_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid()) and p.status = 'Approved'
    )
  );

drop policy if exists "commissioner grants pulse reader access" on public.clash_pulse_readers;
create policy "commissioner grants pulse reader access"
  on public.clash_pulse_readers for insert to authenticated
  with check ((select private.is_launch_commissioner()));

drop policy if exists "commissioner revokes pulse reader access" on public.clash_pulse_readers;
create policy "commissioner revokes pulse reader access"
  on public.clash_pulse_readers for delete to authenticated
  using ((select private.is_launch_commissioner()));

-- Reader grants never confer permission to insert, update, delete, generate,
-- review, approve, hide, or feature facts. They may only read current facts
-- which commissioners have not deliberately hidden.
drop policy if exists "pulse readers select current visible facts" on public.clash_pulse_facts;
create policy "pulse readers select current visible facts"
  on public.clash_pulse_facts for select to authenticated
  using (
    is_current and status <> 'hidden' and exists (
      select 1 from public.clash_pulse_readers r
      join public.launch_profiles p on p.id = r.profile_id
      where p.user_id = (select auth.uid()) and p.status = 'Approved'
    )
  );

drop policy if exists "pulse readers select generation status" on public.clash_pulse_generations;
create policy "pulse readers select generation status"
  on public.clash_pulse_generations for select to authenticated
  using (exists (
    select 1 from public.clash_pulse_readers r
    join public.launch_profiles p on p.id = r.profile_id
    where p.user_id = (select auth.uid()) and p.status = 'Approved'
  ));

drop policy if exists "pulse readers select queue status" on public.clash_pulse_generation_queue;
create policy "pulse readers select queue status"
  on public.clash_pulse_generation_queue for select to authenticated
  using (exists (
    select 1 from public.clash_pulse_readers r
    join public.launch_profiles p on p.id = r.profile_id
    where p.user_id = (select auth.uid()) and p.status = 'Approved'
  ));
