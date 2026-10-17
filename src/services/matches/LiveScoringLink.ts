import type {PublicScheduleEvent} from '@/domain/schedule/ScheduleService';

// These are explicitly paired CCTC matches and public TC Whiteboard scoring
// pages. Match IDs, dates, and team IDs prevent links being reused on another
// matchup or a rescheduled date.
const LIVE_SCORING_FEEDS: Record<string, {
  date: string;
  awayTeamId: string;
  homeTeamId: string;
  url: string;
}> = {
  'beast-mode-vs-riptide-3ed22cf9-623e-4c11-96a2-b0e6c42b7e0d': {
    date: '2026-10-17',
    awayTeamId: 'beast-mode',
    homeTeamId: 'riptide',
    url: 'https://tcwhiteboard.com/l/cctc/matches/f4m09qxvri1hredzcoafzbst/live',
  },
};

/**
 * A manually verified live-scoring link for today's unpublished matchup.
 * Does not attempt to infer a TC Whiteboard link or declare a match live
 * merely because the matchup exists in the schedule.
 */
export function getLiveScoringHref(
  match: Pick<PublicScheduleEvent, 'id' | 'scheduledDate' | 'awayTeamId' | 'homeTeamId'>,
  options: {today: string; hasPublishedResult: boolean},
): string | undefined {
  if (options.hasPublishedResult || !match.scheduledDate || match.scheduledDate !== options.today) {
    return undefined;
  }

  const feed = LIVE_SCORING_FEEDS[match.id];
  if (!feed
    || match.scheduledDate !== feed.date
    || match.awayTeamId !== feed.awayTeamId
    || match.homeTeamId !== feed.homeTeamId) {
    return undefined;
  }

  return feed.url;
}
