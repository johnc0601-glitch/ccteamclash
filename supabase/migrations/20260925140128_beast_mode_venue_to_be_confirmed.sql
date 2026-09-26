-- The owner of Beast on Honey Hill no longer allows league play.
-- Preserve fixtures and historical results; only clear future active-season home venues.
update public.launch_schedule_matches as match
set course_id = null, updated_at = clock_timestamp()
from public.launch_seasons as season, public.launch_teams as team, public.launch_courses as course
where match.season_id = season.id and season.active
  and match.home_team_id = team.id and team.name = 'Beast Mode'
  and match.course_id = course.id and course.name = 'Beast on Honey Hill'
  and match.status in ('Scheduled', 'Postponed', 'Rain Delay')
  and (match.date is null or match.date >= (now() at time zone 'America/New_York')::date);
