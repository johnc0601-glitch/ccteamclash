create or replace function private.is_launch_match_feed_open(target_match_id text, at_time timestamptz default pg_catalog.now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      ((match.date + 31)::timestamp at time zone 'America/New_York') > at_time
    ),
    true
  )
  from public.launch_schedule_matches match
  where match.id = target_match_id;
$$;

revoke all on function private.is_launch_match_feed_open(text,timestamptz) from public;
grant execute on function private.is_launch_match_feed_open(text,timestamptz) to authenticated;

drop policy if exists "members create match feed posts" on public.launch_match_feed_posts;
drop policy if exists "authors edit match feed posts" on public.launch_match_feed_posts;
drop policy if exists "commissioners moderate match feed posts" on public.launch_match_feed_posts;

create policy "members create match feed posts"
on public.launch_match_feed_posts for insert to authenticated
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open(match_id))
);

create policy "authors edit open match feed posts"
on public.launch_match_feed_posts for update to authenticated
using (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and deleted_at is null
  and (select private.is_launch_match_feed_open(match_id))
)
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open(match_id))
);

create policy "commissioners moderate match feed posts"
on public.launch_match_feed_posts for update to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

drop policy if exists "members create match feed comments" on public.launch_match_feed_comments;
drop policy if exists "authors edit match feed comments" on public.launch_match_feed_comments;
drop policy if exists "commissioners moderate match feed comments" on public.launch_match_feed_comments;

create policy "members create match feed comments"
on public.launch_match_feed_comments for insert to authenticated
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
);

create policy "authors edit open match feed comments"
on public.launch_match_feed_comments for update to authenticated
using (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and deleted_at is null
  and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
)
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
);

create policy "commissioners moderate match feed comments"
on public.launch_match_feed_comments for update to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

drop policy if exists "members manage own post reactions" on public.launch_match_feed_post_reactions;
create policy "members manage own open post reactions"
on public.launch_match_feed_post_reactions for all to authenticated
using (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
)
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((select post.match_id from public.launch_match_feed_posts post where post.id = post_id)))
);

drop policy if exists "members manage own comment reactions" on public.launch_match_feed_comment_reactions;
create policy "members manage own open comment reactions"
on public.launch_match_feed_comment_reactions for all to authenticated
using (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((
    select post.match_id
    from public.launch_match_feed_comments comment
    join public.launch_match_feed_posts post on post.id = comment.post_id
    where comment.id = comment_id
  )))
)
with check (
  profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
  and (select private.is_launch_match_feed_open((
    select post.match_id
    from public.launch_match_feed_comments comment
    join public.launch_match_feed_posts post on post.id = comment.post_id
    where comment.id = comment_id
  )))
);
