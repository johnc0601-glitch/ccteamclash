import type {Course} from '@/domain/course/Course';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import type {ClashVenue} from './ClashPrediction';

/**
 * CI home advantage is based on the actual course, not the schedule label.
 * Prefer the course's canonical homeTeamId. For older course rows that do not
 * have it populated yet, fall back to the home team's profile home-course name.
 */
export function classifyClashVenue(
  matchday: Pick<PublicMatchday, 'homeTeam' | 'courseDetails'>,
): ClashVenue {
  const course = matchday.courseDetails;
  if (!course) return 'Neutral';

  if (course.homeTeamId) {
    return course.homeTeamId === matchday.homeTeam.id ? 'Home' : 'Neutral';
  }

  const teamHomeCourse = matchday.homeTeam.team?.homeCourse?.trim();
  if (!teamHomeCourse) return 'Neutral';
  return sameCourseName(course, teamHomeCourse) ? 'Home' : 'Neutral';
}

function sameCourseName(course: Pick<Course, 'name'>, teamHomeCourse: string): boolean {
  return normalize(course.name) === normalize(teamHomeCourse);
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '');
}
