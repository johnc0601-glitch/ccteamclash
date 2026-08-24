drop policy if exists "members create match feed comments" on public.launch_match_feed_comments;
create policy "members create match feed comments"
on public.launch_match_feed_comments for insert to authenticated
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and exists (
    select 1
    from public.launch_match_feed_posts post
    where post.id = post_id
      and post.deleted_at is null
      and (select private.is_launch_match_feed_open(post.match_id))
  )
);

drop policy if exists "members manage own open post reactions" on public.launch_match_feed_post_reactions;
create policy "members manage own open post reactions"
on public.launch_match_feed_post_reactions for all to authenticated
using (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and exists (
    select 1 from public.launch_match_feed_posts post
    where post.id = post_id
      and post.deleted_at is null
      and (select private.is_launch_match_feed_open(post.match_id))
  )
)
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and exists (
    select 1 from public.launch_match_feed_posts post
    where post.id = post_id
      and post.deleted_at is null
      and (select private.is_launch_match_feed_open(post.match_id))
  )
);

drop policy if exists "members manage own open comment reactions" on public.launch_match_feed_comment_reactions;
create policy "members manage own open comment reactions"
on public.launch_match_feed_comment_reactions for all to authenticated
using (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and exists (
    select 1
    from public.launch_match_feed_comments comment
    join public.launch_match_feed_posts post on post.id = comment.post_id
    where comment.id = comment_id
      and comment.deleted_at is null
      and post.deleted_at is null
      and (select private.is_launch_match_feed_open(post.match_id))
  )
)
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and exists (
    select 1
    from public.launch_match_feed_comments comment
    join public.launch_match_feed_posts post on post.id = comment.post_id
    where comment.id = comment_id
      and comment.deleted_at is null
      and post.deleted_at is null
      and (select private.is_launch_match_feed_open(post.match_id))
  )
);
