-- Small single-organizer workspace, isolated from all Team Clash records.
-- Atomic versioned writes prevent one browser tab from overwriting another.
create table public.levelup_owners (
  user_id uuid primary key references auth.users(id) on delete restrict
);
create table public.levelup_workspaces (
  owner_id uuid primary key references public.levelup_owners(user_id) on delete restrict,
  version integer not null default 1 check (version > 0),
  data jsonb not null check (jsonb_typeof(data)='object' and pg_column_size(data)<5000000),
  updated_at timestamptz not null default now()
);
create table public.levelup_source_archives (
  owner_id uuid primary key references public.levelup_owners(user_id) on delete restrict,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.levelup_owners enable row level security;
alter table public.levelup_workspaces enable row level security;
alter table public.levelup_source_archives enable row level security;
revoke all on public.levelup_owners, public.levelup_workspaces, public.levelup_source_archives from anon, authenticated;
grant select on public.levelup_owners, public.levelup_workspaces, public.levelup_source_archives to authenticated;
grant update (data,version,updated_at) on public.levelup_workspaces to authenticated;
create policy owner_self on public.levelup_owners for select to authenticated using (user_id=(select auth.uid()));
create policy workspace_read on public.levelup_workspaces for select to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.levelup_owners where user_id=(select auth.uid())));
create policy workspace_update on public.levelup_workspaces for update to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.levelup_owners where user_id=(select auth.uid()))) with check (owner_id=(select auth.uid()) and exists(select 1 from public.levelup_owners where user_id=(select auth.uid())));
create policy archive_read on public.levelup_source_archives for select to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.levelup_owners where user_id=(select auth.uid())));
