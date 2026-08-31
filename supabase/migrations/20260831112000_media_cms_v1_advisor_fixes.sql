-- Media CMS V1 advisor follow-up: cover new foreign keys and keep one SELECT policy per role.

create index if not exists launch_stories_created_by_profile_id_idx
  on public.launch_stories(created_by_profile_id)
  where created_by_profile_id is not null;

create index if not exists launch_stories_updated_by_profile_id_idx
  on public.launch_stories(updated_by_profile_id)
  where updated_by_profile_id is not null;

create index if not exists launch_stories_hero_asset_id_idx
  on public.launch_stories(hero_asset_id)
  where hero_asset_id is not null;

create index if not exists media_assets_uploaded_by_profile_id_idx
  on public.media_assets(uploaded_by_profile_id)
  where uploaded_by_profile_id is not null;

drop policy if exists "public reads published stories" on public.launch_stories;
drop policy if exists "commissioner reads all stories" on public.launch_stories;
drop policy if exists "anonymous reads published stories" on public.launch_stories;
drop policy if exists "authenticated reads permitted stories" on public.launch_stories;

create policy "anonymous reads published stories"
  on public.launch_stories
  for select
  to anon
  using (status = 'published');

create policy "authenticated reads permitted stories"
  on public.launch_stories
  for select
  to authenticated
  using (status = 'published' or private.is_launch_commissioner());
