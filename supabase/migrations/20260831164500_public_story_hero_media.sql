drop policy if exists "gallery or commissioner reads media assets" on public.media_assets;

create policy "gallery story hero or commissioner reads media assets"
  on public.media_assets
  for select
  to anon, authenticated
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
    or (select private.is_launch_commissioner())
  );
