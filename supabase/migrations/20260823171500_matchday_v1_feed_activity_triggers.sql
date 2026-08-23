create or replace function private.touch_launch_match_feed_post_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.launch_match_feed_posts
  set last_activity_at = pg_catalog.now()
  where id = coalesce(new.post_id, old.post_id);
  return coalesce(new, old);
end;
$$;

create or replace function private.touch_launch_match_feed_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_post_id uuid;
begin
  select post_id
  into target_post_id
  from public.launch_match_feed_comments
  where id = coalesce(new.comment_id, old.comment_id);

  if target_post_id is not null then
    update public.launch_match_feed_posts
    set last_activity_at = pg_catalog.now()
    where id = target_post_id;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.touch_launch_match_feed_post_activity() from public;
revoke all on function private.touch_launch_match_feed_comment_activity() from public;
