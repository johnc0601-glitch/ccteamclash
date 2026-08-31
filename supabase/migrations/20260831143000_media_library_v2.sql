-- Media Library V2: curate reusable league assets into a public photo gallery.

alter table public.media_assets
  add column if not exists gallery_visible boolean not null default false,
  add column if not exists taken_at timestamptz;

create index if not exists media_assets_public_gallery_idx
  on public.media_assets(gallery_visible, taken_at desc, created_at desc)
  where deleted_at is null;

-- Public users only see assets deliberately published to the gallery.
-- Commissioners retain full library visibility through the same SELECT policy.
drop policy if exists "public reads media assets" on public.media_assets;
drop policy if exists "public reads gallery media assets" on public.media_assets;
drop policy if exists "commissioner reads all media assets" on public.media_assets;
create policy "gallery or commissioner reads media assets"
  on public.media_assets
  for select
  to anon, authenticated
  using (
    (deleted_at is null and gallery_visible = true)
    or private.is_launch_commissioner()
  );
