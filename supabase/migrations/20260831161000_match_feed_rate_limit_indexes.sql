create index if not exists launch_match_feed_posts_profile_created_rate_idx
  on public.launch_match_feed_posts(profile_id, created_at desc)
  where deleted_at is null;

create index if not exists launch_match_feed_comments_profile_created_rate_idx
  on public.launch_match_feed_comments(profile_id, created_at desc)
  where deleted_at is null;
