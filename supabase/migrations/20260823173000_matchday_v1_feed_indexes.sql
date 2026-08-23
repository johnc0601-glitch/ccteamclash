create index if not exists launch_match_feed_posts_profile_idx
  on public.launch_match_feed_posts(profile_id);
create index if not exists launch_match_feed_posts_deleted_by_idx
  on public.launch_match_feed_posts(deleted_by)
  where deleted_by is not null;

create index if not exists launch_match_feed_comments_profile_idx
  on public.launch_match_feed_comments(profile_id);
create index if not exists launch_match_feed_comments_parent_post_idx
  on public.launch_match_feed_comments(parent_comment_id, post_id)
  where parent_comment_id is not null;
create index if not exists launch_match_feed_comments_deleted_by_idx
  on public.launch_match_feed_comments(deleted_by)
  where deleted_by is not null;

create index if not exists launch_match_feed_post_reactions_profile_idx
  on public.launch_match_feed_post_reactions(profile_id);
create index if not exists launch_match_feed_comment_reactions_profile_idx
  on public.launch_match_feed_comment_reactions(profile_id);

create index if not exists launch_match_roster_unlocks_team_idx
  on public.launch_match_roster_unlocks(team_id);
create index if not exists launch_match_roster_unlocks_unlocked_by_idx
  on public.launch_match_roster_unlocks(unlocked_by);
create index if not exists launch_match_roster_unlocks_relocked_by_idx
  on public.launch_match_roster_unlocks(relocked_by)
  where relocked_by is not null;
