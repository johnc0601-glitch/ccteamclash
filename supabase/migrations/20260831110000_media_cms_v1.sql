-- Media CMS V1: immutable story identity, editorial lifecycle, and reusable media assets.
-- Legacy excerpt/display_date columns intentionally remain during the transition so older preview code stays compatible.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'league-media',
  storage_path text not null,
  original_filename text,
  mime_type text not null,
  width integer,
  height integer,
  alt_text text not null default '',
  caption text not null default '',
  season_id text references public.launch_seasons(id) on delete set null,
  round_id text references public.launch_rounds(id) on delete set null,
  match_id text references public.launch_schedule_matches(id) on delete set null,
  team_id text references public.launch_teams(id) on delete set null,
  uploaded_by_profile_id text references public.launch_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint media_assets_bucket_path_key unique (bucket, storage_path),
  constraint media_assets_width_check check (width is null or width > 0),
  constraint media_assets_height_check check (height is null or height > 0)
);

create index if not exists media_assets_created_at_idx
  on public.media_assets(created_at desc);
create index if not exists media_assets_season_id_idx
  on public.media_assets(season_id) where season_id is not null;
create index if not exists media_assets_round_id_idx
  on public.media_assets(round_id) where round_id is not null;
create index if not exists media_assets_match_id_idx
  on public.media_assets(match_id) where match_id is not null;
create index if not exists media_assets_team_id_idx
  on public.media_assets(team_id) where team_id is not null;

alter table public.media_assets enable row level security;

drop policy if exists "public reads media assets" on public.media_assets;
create policy "public reads media assets"
  on public.media_assets
  for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "commissioner inserts media assets" on public.media_assets;
create policy "commissioner inserts media assets"
  on public.media_assets
  for insert
  to authenticated
  with check (private.is_launch_commissioner());

drop policy if exists "commissioner updates media assets" on public.media_assets;
create policy "commissioner updates media assets"
  on public.media_assets
  for update
  to authenticated
  using (private.is_launch_commissioner())
  with check (private.is_launch_commissioner());

drop policy if exists "commissioner deletes media assets" on public.media_assets;
create policy "commissioner deletes media assets"
  on public.media_assets
  for delete
  to authenticated
  using (private.is_launch_commissioner());

alter table public.launch_stories add column if not exists id uuid default gen_random_uuid();
update public.launch_stories set id = gen_random_uuid() where id is null;
alter table public.launch_stories alter column id set not null;

alter table public.launch_stories add column if not exists status text not null default 'published';
alter table public.launch_stories alter column status set default 'draft';
alter table public.launch_stories add column if not exists published_at timestamptz;
update public.launch_stories
set published_at = coalesce(published_at, updated_at, created_at)
where status = 'published' and published_at is null;

alter table public.launch_stories add column if not exists revision integer not null default 1;
alter table public.launch_stories add column if not exists created_by_profile_id text references public.launch_profiles(id) on delete set null;
alter table public.launch_stories add column if not exists updated_by_profile_id text references public.launch_profiles(id) on delete set null;
alter table public.launch_stories add column if not exists season_id text references public.launch_seasons(id) on delete set null;
alter table public.launch_stories add column if not exists round_id text references public.launch_rounds(id) on delete set null;
alter table public.launch_stories add column if not exists match_id text references public.launch_schedule_matches(id) on delete set null;
alter table public.launch_stories add column if not exists team_id text references public.launch_teams(id) on delete set null;
alter table public.launch_stories add column if not exists hero_asset_id uuid references public.media_assets(id) on delete set null;
alter table public.launch_stories add column if not exists archived_at timestamptz;

alter table public.launch_stories drop constraint if exists launch_stories_status_check;
alter table public.launch_stories add constraint launch_stories_status_check
  check (status in ('draft','published','archived'));
alter table public.launch_stories drop constraint if exists launch_stories_revision_check;
alter table public.launch_stories add constraint launch_stories_revision_check
  check (revision > 0);

alter table public.launch_stories drop constraint if exists launch_stories_pkey;
alter table public.launch_stories add constraint launch_stories_pkey primary key (id);
create unique index if not exists launch_stories_slug_unique_idx
  on public.launch_stories(slug);

create index if not exists launch_stories_status_published_idx
  on public.launch_stories(status, published_at desc, updated_at desc);
create index if not exists launch_stories_season_id_idx
  on public.launch_stories(season_id) where season_id is not null;
create index if not exists launch_stories_round_id_idx
  on public.launch_stories(round_id) where round_id is not null;
create index if not exists launch_stories_match_id_idx
  on public.launch_stories(match_id) where match_id is not null;
create index if not exists launch_stories_team_id_idx
  on public.launch_stories(team_id) where team_id is not null;

-- Only one published story can be the homepage feature.
drop index if exists public.launch_stories_single_featured_idx;
create unique index launch_stories_single_featured_idx
  on public.launch_stories(featured)
  where featured = true and status = 'published';

alter table public.launch_stories enable row level security;

drop policy if exists "public reads stories" on public.launch_stories;
drop policy if exists "public reads published stories" on public.launch_stories;
create policy "public reads published stories"
  on public.launch_stories
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "commissioner reads all stories" on public.launch_stories;
create policy "commissioner reads all stories"
  on public.launch_stories
  for select
  to authenticated
  using (private.is_launch_commissioner());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'league-media',
  'league-media',
  true,
  10000000,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads league media" on storage.objects;
create policy "public reads league media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'league-media');

drop policy if exists "commissioner uploads league media" on storage.objects;
create policy "commissioner uploads league media"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'league-media' and private.is_launch_commissioner());

drop policy if exists "commissioner updates league media" on storage.objects;
create policy "commissioner updates league media"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'league-media' and private.is_launch_commissioner())
  with check (bucket_id = 'league-media' and private.is_launch_commissioner());

drop policy if exists "commissioner deletes league media" on storage.objects;
create policy "commissioner deletes league media"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'league-media' and private.is_launch_commissioner());

-- Bootstrap the current public stories into the canonical table. Existing DB-authored versions win.
insert into public.launch_stories (
  slug,
  title,
  category,
  display_date,
  excerpt,
  image,
  body,
  links,
  featured,
  sort_order,
  status,
  published_at,
  revision
)
values
  (
    'match-5-everything-on-the-line',
    'Match 5: Everything Is on the Line',
    'Match Preview',
    'July 12, 2026',
    'The standings tighten as the league heads into a pivotal weekend of Team Clash competition.',
    'hero',
    '["Rivalries, standings pressure, and one of the biggest weekends of the season converge at Castle Hayne.","Every point matters as teams fight for position entering the final stretch. Expect aggressive lines, tight matches, and plenty of Team Clash energy."]'::jsonb,
    '[{"label":"View schedule","url":"/schedule"}]'::jsonb,
    true,
    0,
    'published',
    '2026-07-12T12:00:00Z'::timestamptz,
    1
  ),
  (
    'dark-knights-statement-match',
    'Dark Knights Prepare for a Statement Match',
    'Team News',
    'July 10, 2026',
    'A confident roster enters the weekend with playoff positioning within reach.',
    'purple',
    '["The Dark Knights arrive focused and confident, with a chance to reshape the standings.","Their matchup with the Ninjas should be one of the closest battles of the weekend."]'::jsonb,
    null,
    false,
    1,
    'published',
    '2026-07-10T12:00:00Z'::timestamptz,
    1
  ),
  (
    'castle-hayne-course-report',
    'Castle Hayne Is Ready for Clash Day',
    'Course Report',
    'July 8, 2026',
    'Course conditions, key holes, and what players should expect this Saturday.',
    'orange',
    '["Castle Hayne rewards controlled drives and confident putting.","Players should expect warm conditions and a course that will punish missed landing zones."]'::jsonb,
    null,
    false,
    2,
    'published',
    '2026-07-08T12:00:00Z'::timestamptz,
    1
  )
on conflict (slug) do nothing;
