drop policy if exists "authors edit open match feed posts" on public.launch_match_feed_posts;
drop policy if exists "commissioners moderate match feed posts" on public.launch_match_feed_posts;
create policy "authors or commissioners update match feed posts"
on public.launch_match_feed_posts for update to authenticated
using (
  (
    profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    and deleted_at is null
    and (select private.is_launch_match_feed_open(match_id))
  )
  or (select private.is_launch_commissioner())
)
with check (
  (
    profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    and (select private.is_launch_match_feed_open(match_id))
  )
  or (select private.is_launch_commissioner())
);

drop policy if exists "authors edit open match feed comments" on public.launch_match_feed_comments;
drop policy if exists "commissioners moderate match feed comments" on public.launch_match_feed_comments;
create policy "authors or commissioners update match feed comments"
on public.launch_match_feed_comments for update to authenticated
using (
  (
    profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    and deleted_at is null
    and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
  )
  or (select private.is_launch_commissioner())
)
with check (
  (
    profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
  )
  or (select private.is_launch_commissioner())
);

drop policy if exists "members manage own open post reactions" on public.launch_match_feed_post_reactions;
create policy "members insert own open post reactions"
on public.launch_match_feed_post_reactions for insert to authenticated
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
  and (select deleted_at is null from public.launch_match_feed_posts post where post.id = post_id)
);
create policy "members update own open post reactions"
on public.launch_match_feed_post_reactions for update to authenticated
using (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
)
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
  and (select deleted_at is null from public.launch_match_feed_posts post where post.id = post_id)
);
create policy "members delete own open post reactions"
on public.launch_match_feed_post_reactions for delete to authenticated
using (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
);

drop policy if exists "members manage own open comment reactions" on public.launch_match_feed_comment_reactions;
create policy "members insert own open comment reactions"
on public.launch_match_feed_comment_reactions for insert to authenticated
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((
    select post.match_id from public.launch_match_feed_comments comment
    join public.launch_match_feed_posts post on post.id = comment.post_id
    where comment.id = comment_id
  )))
  and (select comment.deleted_at is null and post.deleted_at is null
       from public.launch_match_feed_comments comment
       join public.launch_match_feed_posts post on post.id = comment.post_id
       where comment.id = comment_id)
);
create policy "members update own open comment reactions"
on public.launch_match_feed_comment_reactions for update to authenticated
using (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((
    select post.match_id from public.launch_match_feed_comments comment
    join public.launch_match_feed_posts post on post.id = comment.post_id
    where comment.id = comment_id
  )))
)
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((
    select post.match_id from public.launch_match_feed_comments comment
    join public.launch_match_feed_posts post on post.id = comment.post_id
    where comment.id = comment_id
  )))
  and (select comment.deleted_at is null and post.deleted_at is null
       from public.launch_match_feed_comments comment
       join public.launch_match_feed_posts post on post.id = comment.post_id
       where comment.id = comment_id)
);
create policy "members delete own open comment reactions"
on public.launch_match_feed_comment_reactions for delete to authenticated
using (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((
    select post.match_id from public.launch_match_feed_comments comment
    join public.launch_match_feed_posts post on post.id = comment.post_id
    where comment.id = comment_id
  )))
);

drop policy if exists "commissioners read roster unlocks" on public.launch_match_roster_unlocks;
drop policy if exists "captains read own roster unlocks" on public.launch_match_roster_unlocks;
create policy "commissioners and captains read roster unlocks"
on public.launch_match_roster_unlocks for select to authenticated
using (
  (select private.is_launch_commissioner())
  or team_id = (
    select captain_team_id
    from public.launch_profiles
    where user_id = (select auth.uid())
      and status = 'Approved'
      and role = 'Captain'
    limit 1
  )
);
