create index if not exists launch_match_feed_posts_match_created_cursor_idx
  on public.launch_match_feed_posts(match_id, created_at desc, id desc);
