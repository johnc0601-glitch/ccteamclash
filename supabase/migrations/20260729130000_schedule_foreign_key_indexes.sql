create index if not exists launch_courses_home_team_id_idx
on public.launch_courses(home_team_id);

create index if not exists launch_schedule_matches_home_team_id_idx
on public.launch_schedule_matches(home_team_id);

create index if not exists launch_schedule_matches_away_team_id_idx
on public.launch_schedule_matches(away_team_id);

create index if not exists launch_schedule_matches_course_id_idx
on public.launch_schedule_matches(course_id);
