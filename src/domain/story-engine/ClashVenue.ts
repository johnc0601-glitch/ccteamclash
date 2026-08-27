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
  return classifyClashVenueFromIds(
    matchday.homeTeam.id,
    matchday.courseDetails?.homeTeamId,
  );
}

/**
 * ID-only form used by server-side prediction capture before a PublicMatchday
 * view model exists. Keeping this rule here prevents CI and Team Strength from
 * drifting into different definitions of a home match.
 */
export function classifyClashVenueFromIds(
  scheduledHomeTeamId: string,
  courseHomeTeamId: string | null | undefined,
): ClashVenue {
  if (!courseHomeTeamId) return 'Neutral';
  return courseHomeTeamId === scheduledHomeTeamId ? 'Home' : 'Neutral';
}
