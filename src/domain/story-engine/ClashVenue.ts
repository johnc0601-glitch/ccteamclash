import type {PublicMatchday} from '@/services/matches/MatchdayService';
import type {ClashVenue} from './ClashPrediction';

/**
 * CI home advantage is based on the actual course, not the schedule label.
 * Course records carry the canonical homeTeamId. If the scheduled home team
 * does not own the match course, the match is neutral for CI purposes.
 */
export function classifyClashVenue(
  matchday: Pick<PublicMatchday, 'homeTeam' | 'courseDetails'>,
): ClashVenue {
  const course = matchday.courseDetails;
  if (!course?.homeTeamId) return 'Neutral';
  return course.homeTeamId === matchday.homeTeam.id ? 'Home' : 'Neutral';
}
