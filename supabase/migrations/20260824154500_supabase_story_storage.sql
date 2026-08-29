create table if not exists public.launch_stories (
  slug text primary key,
  title text not null,
  category text not null default 'Announcement',
  display_date text not null default 'Date to be announced',
  excerpt text not null default '',
  image text not null default 'hero',
  body jsonb not null default '[]'::jsonb,
  links jsonb,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint launch_stories_title_check check (length(btrim(title)) > 0),
  constraint launch_stories_body_array_check check (jsonb_typeof(body) = 'array'),
  constraint launch_stories_links_array_check check (links is null or jsonb_typeof(links) = 'array')
);

create index if not exists launch_stories_sort_order_idx
  on public.launch_stories(sort_order asc, updated_at desc);

create unique index if not exists launch_stories_single_featured_idx
  on public.launch_stories(featured)
  where featured = true;

alter table public.launch_stories enable row level security;

drop policy if exists "public reads stories" on public.launch_stories;
create policy "public reads stories"
  on public.launch_stories
  for select
  using (true);

drop policy if exists "commissioner inserts stories" on public.launch_stories;
create policy "commissioner inserts stories"
  on public.launch_stories
  for insert
  to authenticated
  with check (private.is_launch_commissioner());

drop policy if exists "commissioner updates stories" on public.launch_stories;
create policy "commissioner updates stories"
  on public.launch_stories
  for update
  to authenticated
  using (private.is_launch_commissioner())
  with check (private.is_launch_commissioner());

drop policy if exists "commissioner deletes stories" on public.launch_stories;
create policy "commissioner deletes stories"
  on public.launch_stories
  for delete
  to authenticated
  using (private.is_launch_commissioner());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-images',
  'story-images',
  true,
  3000000,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads story images" on storage.objects;
create policy "public reads story images"
  on storage.objects
  for select
  using (bucket_id = 'story-images');

drop policy if exists "commissioner uploads story images" on storage.objects;
create policy "commissioner uploads story images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'story-images' and private.is_launch_commissioner());

drop policy if exists "commissioner updates story images" on storage.objects;
create policy "commissioner updates story images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'story-images' and private.is_launch_commissioner())
  with check (bucket_id = 'story-images' and private.is_launch_commissioner());

drop policy if exists "commissioner deletes story images" on storage.objects;
create policy "commissioner deletes story images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'story-images' and private.is_launch_commissioner());