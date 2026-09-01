-- Matchday Hard Delete V1
-- Commissioner post removal should leave no public tombstone or retained feed history.
-- Existing comments, reactions, reports, and related media metadata are deleted through
-- foreign-key cascades or the cleanup below.

create or replace function private.hard_delete_removed_match_feed_post()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.deleted_at is null then
    return new;
  end if;

  if old.image_path is not null then
    delete from public.media_assets
    where bucket = 'match-feed'
      and storage_path = old.image_path;
  end if;

  delete from public.launch_match_feed_posts
  where id = new.id;

  return null;
end;
$$;

drop trigger if exists hard_delete_removed_match_feed_post_trigger
  on public.launch_match_feed_posts;

create trigger hard_delete_removed_match_feed_post_trigger
after update of deleted_at
on public.launch_match_feed_posts
for each row
when (new.deleted_at is not null)
execute function private.hard_delete_removed_match_feed_post();

-- Purge any tombstoned posts left by the previous soft-delete behavior.
delete from public.media_assets asset
using public.launch_match_feed_posts post
where post.deleted_at is not null
  and post.image_path is not null
  and asset.bucket = 'match-feed'
  and asset.storage_path = post.image_path;

delete from public.launch_match_feed_posts
where deleted_at is not null;
