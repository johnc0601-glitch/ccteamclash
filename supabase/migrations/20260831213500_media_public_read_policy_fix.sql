-- Keep anonymous public-media reads independent from commissioner-only helpers.
-- Authenticated users retain commissioner access to the full managed media library.

drop policy if exists "gallery story hero or commissioner reads media assets" on public.media_assets;
drop policy if exists "anonymous reads gallery or story hero media assets" on public.media_assets;
drop policy if exists "authenticated reads gallery story hero or commissioner media assets" on public.media_assets;

create policy "anonymous reads gallery or story hero media assets"
on public.media_assets
for select
to anon
using (
  deleted_at is null
  and (
    gallery_visible = true
    or exists (
      select 1
      from public.launch_stories story
      where story.hero_asset_id = media_assets.id
        and story.status = 'published'
    )
  )
);

create policy "authenticated reads gallery story hero or commissioner media assets"
on public.media_assets
for select
to authenticated
using (
  (
    deleted_at is null
    and (
      gallery_visible = true
      or exists (
        select 1
        from public.launch_stories story
        where story.hero_asset_id = media_assets.id
          and story.status = 'published'
      )
    )
  )
  or private.is_launch_commissioner()
);
