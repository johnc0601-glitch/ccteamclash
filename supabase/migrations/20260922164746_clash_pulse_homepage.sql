create table if not exists public.clash_pulse_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (char_length(category) between 1 and 40),
  fact_text text not null check (char_length(fact_text) between 1 and 240),
  season_id text references public.launch_seasons(id) on delete set null,
  match_id text references public.launch_schedule_matches(id) on delete set null,
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clash_pulse_items_public_feed_idx
  on public.clash_pulse_items (is_active, published_at desc);
create index if not exists clash_pulse_items_season_idx
  on public.clash_pulse_items (season_id);
create index if not exists clash_pulse_items_match_idx
  on public.clash_pulse_items (match_id);

alter table public.clash_pulse_items enable row level security;

revoke all on public.clash_pulse_items from anon, authenticated;
grant select on public.clash_pulse_items to anon, authenticated;
grant insert, update on public.clash_pulse_items to authenticated;

create policy "public reads active clash pulse"
on public.clash_pulse_items
for select
to anon, authenticated
using (
  is_active
  and (expires_at is null or expires_at > now())
);

create policy "commissioners read all clash pulse"
on public.clash_pulse_items
for select
to authenticated
using ((select private.is_launch_commissioner()));

create policy "commissioners insert clash pulse"
on public.clash_pulse_items
for insert
to authenticated
with check ((select private.is_launch_commissioner()));

create policy "commissioners update clash pulse"
on public.clash_pulse_items
for update
to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));
