create index if not exists launch_match_feed_reports_reviewed_by_idx
  on public.launch_match_feed_reports(reviewed_by_profile_id)
  where reviewed_by_profile_id is not null;
