create table if not exists public.clash_line_items (
  id uuid primary key default gen_random_uuid(),
  source_candidate_id text not null unique,
  trigger_type text not null,
  fact_text text not null check (char_length(fact_text) between 1 and 320),
  season_id text,
  event_id text,
  match_id text,
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clash_line_items_public_feed_idx
  on public.clash_line_items (is_active, published_at desc);

alter table public.clash_line_items enable row level security;

drop policy if exists "public reads active clash line" on public.clash_line_items;
create policy "public reads active clash line"
on public.clash_line_items for select
to anon, authenticated
using (is_active and (expires_at is null or expires_at > now()));

drop policy if exists "commissioners manage clash line" on public.clash_line_items;
create policy "commissioners manage clash line"
on public.clash_line_items for all
to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

revoke all on public.clash_line_items from anon;
grant select on public.clash_line_items to anon;
grant select, insert, update, delete on public.clash_line_items to authenticated;
