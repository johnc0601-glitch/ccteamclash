create index if not exists launch_clubhouse_moderation_team_idx
  on public.launch_clubhouse_moderation_events(team_id);

create index if not exists launch_clubhouse_moderation_author_idx
  on public.launch_clubhouse_moderation_events(content_author_profile_id)
  where content_author_profile_id is not null;
