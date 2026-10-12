-- A single publicly readable marker; only approved commissioners can change it.
-- The badge is computed from new_episode_at at render time and expires in 7 days.
create table if not exists public.launch_podcast_status (
  id text primary key check (id = 'clash-cast'),
  new_episode_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.launch_podcast_status (id)
values ('clash-cast')
on conflict (id) do nothing;

alter table public.launch_podcast_status enable row level security;

revoke all on public.launch_podcast_status from anon, authenticated;
grant select on public.launch_podcast_status to anon, authenticated;
grant update (new_episode_at, updated_at) on public.launch_podcast_status to authenticated;

create policy "podcast status publicly readable"
  on public.launch_podcast_status
  for select
  to anon, authenticated
  using (true);

create policy "commissioners manage podcast status"
  on public.launch_podcast_status
  for update
  to authenticated
  using ((select private.is_launch_commissioner()))
  with check ((select private.is_launch_commissioner()));
