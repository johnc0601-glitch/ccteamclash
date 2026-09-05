create table if not exists public.launch_match_previews (
  match_id text primary key references public.launch_schedule_matches(id) on delete cascade,
  excerpt text not null,
  story_url text,
  updated_by text references public.launch_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint launch_match_previews_excerpt_length check (char_length(excerpt) <= 2000),
  constraint launch_match_previews_story_url_length check (story_url is null or char_length(story_url) <= 600)
);

alter table public.launch_match_previews enable row level security;

grant select on public.launch_match_previews to anon, authenticated;
grant insert, update, delete on public.launch_match_previews to authenticated;

drop policy if exists "public reads match previews" on public.launch_match_previews;
drop policy if exists "commissioners insert match previews" on public.launch_match_previews;
drop policy if exists "commissioners update match previews" on public.launch_match_previews;
drop policy if exists "commissioners delete match previews" on public.launch_match_previews;

create policy "public reads match previews"
on public.launch_match_previews
for select
to anon, authenticated
using (true);

create policy "commissioners insert match previews"
on public.launch_match_previews
for insert
to authenticated
with check (
  exists (
    select 1
    from public.launch_profiles p
    where p.user_id = auth.uid()
      and p.role = 'Commissioner'
      and p.status = 'Approved'
  )
);

create policy "commissioners update match previews"
on public.launch_match_previews
for update
to authenticated
using (
  exists (
    select 1
    from public.launch_profiles p
    where p.user_id = auth.uid()
      and p.role = 'Commissioner'
      and p.status = 'Approved'
  )
)
with check (
  exists (
    select 1
    from public.launch_profiles p
    where p.user_id = auth.uid()
      and p.role = 'Commissioner'
      and p.status = 'Approved'
  )
);

create policy "commissioners delete match previews"
on public.launch_match_previews
for delete
to authenticated
using (
  exists (
    select 1
    from public.launch_profiles p
    where p.user_id = auth.uid()
      and p.role = 'Commissioner'
      and p.status = 'Approved'
  )
);
