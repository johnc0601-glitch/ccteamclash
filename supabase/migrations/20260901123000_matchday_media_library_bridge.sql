-- Matchday Media Library Bridge V1
-- Register every Matchday feed photo as a reusable media asset while preserving
-- its match, season, round, and both-team context. Matchday uploads remain
-- private to the commissioner library until explicitly published to the gallery.

create table if not exists public.media_asset_team_links (
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  team_id text not null references public.launch_teams(id) on delete cascade,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  primary key (media_asset_id, team_id),
  constraint media_asset_team_links_source_check check (source in ('manual', 'match'))
);

create index if not exists media_asset_team_links_team_idx
  on public.media_asset_team_links(team_id, media_asset_id);

alter table public.media_asset_team_links enable row level security;

drop policy if exists "anonymous reads public media team links" on public.media_asset_team_links;
create policy "anonymous reads public media team links"
on public.media_asset_team_links
for select
to anon
using (
  exists (
    select 1
    from public.media_assets asset
    where asset.id = media_asset_team_links.media_asset_id
      and asset.deleted_at is null
      and asset.gallery_visible = true
  )
);

drop policy if exists "authenticated reads public or commissioner media team links" on public.media_asset_team_links;
create policy "authenticated reads public or commissioner media team links"
on public.media_asset_team_links
for select
to authenticated
using (
  exists (
    select 1
    from public.media_assets asset
    where asset.id = media_asset_team_links.media_asset_id
      and asset.deleted_at is null
      and asset.gallery_visible = true
  )
  or private.is_launch_commissioner()
);

drop policy if exists "commissioner manages media team links" on public.media_asset_team_links;
create policy "commissioner manages media team links"
on public.media_asset_team_links
for all
to authenticated
using (private.is_launch_commissioner())
with check (private.is_launch_commissioner());

create or replace function private.register_match_feed_media_asset()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  match_row record;
  asset_id uuid;
  path_to_register text;
begin
  -- A commissioner removal clears image_path. Retire the corresponding library
  -- record as well so a moderated/deleted image cannot remain reusable by mistake.
  if tg_op = 'UPDATE'
     and old.image_path is not null
     and (new.image_path is null or new.deleted_at is not null)
  then
    update public.media_assets
    set deleted_at = coalesce(deleted_at, now()),
        gallery_visible = false
    where bucket = 'match-feed'
      and storage_path = old.image_path;
  end if;

  if new.image_path is null or new.deleted_at is not null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.image_path is not distinct from new.image_path then
    return new;
  end if;

  path_to_register := new.image_path;

  select
    match_row_source.season_id,
    match_row_source.round_id,
    match_row_source.home_team_id,
    match_row_source.away_team_id
  into match_row
  from public.launch_schedule_matches match_row_source
  where match_row_source.id = new.match_id;

  insert into public.media_assets (
    bucket,
    storage_path,
    original_filename,
    mime_type,
    alt_text,
    caption,
    season_id,
    round_id,
    match_id,
    team_id,
    uploaded_by_profile_id,
    gallery_visible,
    taken_at,
    deleted_at
  ) values (
    'match-feed',
    path_to_register,
    null,
    'image/webp',
    'Matchday photo',
    '',
    match_row.season_id,
    match_row.round_id,
    new.match_id,
    null,
    new.profile_id,
    false,
    new.created_at,
    null
  )
  on conflict (bucket, storage_path) do update
  set season_id = excluded.season_id,
      round_id = excluded.round_id,
      match_id = excluded.match_id,
      uploaded_by_profile_id = excluded.uploaded_by_profile_id,
      taken_at = coalesce(public.media_assets.taken_at, excluded.taken_at),
      deleted_at = null
  returning id into asset_id;

  if match_row.home_team_id is not null then
    insert into public.media_asset_team_links (media_asset_id, team_id, source)
    values (asset_id, match_row.home_team_id, 'match')
    on conflict (media_asset_id, team_id) do update set source = 'match';
  end if;

  if match_row.away_team_id is not null then
    insert into public.media_asset_team_links (media_asset_id, team_id, source)
    values (asset_id, match_row.away_team_id, 'match')
    on conflict (media_asset_id, team_id) do update set source = 'match';
  end if;

  return new;
end;
$$;

drop trigger if exists register_match_feed_media_asset_trigger
  on public.launch_match_feed_posts;

create trigger register_match_feed_media_asset_trigger
after insert or update of image_path, deleted_at
on public.launch_match_feed_posts
for each row
execute function private.register_match_feed_media_asset();

-- Backfill existing Matchday photos so the library is complete from day one.
insert into public.media_assets (
  bucket,
  storage_path,
  original_filename,
  mime_type,
  alt_text,
  caption,
  season_id,
  round_id,
  match_id,
  team_id,
  uploaded_by_profile_id,
  gallery_visible,
  taken_at,
  deleted_at
)
select
  'match-feed',
  post.image_path,
  null,
  'image/webp',
  'Matchday photo',
  '',
  match.season_id,
  match.round_id,
  post.match_id,
  null,
  post.profile_id,
  false,
  post.created_at,
  null
from public.launch_match_feed_posts post
join public.launch_schedule_matches match on match.id = post.match_id
where post.image_path is not null
  and post.deleted_at is null
on conflict (bucket, storage_path) do update
set season_id = excluded.season_id,
    round_id = excluded.round_id,
    match_id = excluded.match_id,
    uploaded_by_profile_id = excluded.uploaded_by_profile_id,
    taken_at = coalesce(public.media_assets.taken_at, excluded.taken_at),
    deleted_at = null;

insert into public.media_asset_team_links (media_asset_id, team_id, source)
select asset.id, team.team_id, 'match'
from public.media_assets asset
join public.launch_schedule_matches match on match.id = asset.match_id
cross join lateral (
  values (match.home_team_id), (match.away_team_id)
) team(team_id)
where asset.bucket = 'match-feed'
  and asset.deleted_at is null
  and team.team_id is not null
on conflict (media_asset_id, team_id) do update set source = 'match';
