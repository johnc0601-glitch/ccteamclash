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
  // October 17 — established provider live-feed link.
  'beast-mode-vs-riptide-3ed22cf9-623e-4c11-96a2-b0e6c42b7e0d': {
    date: '2026-10-17',
    awayTeamId: 'beast-mode',
    homeTeamId: 'riptide',
    url: 'https://tcwhiteboard.com/l/cctc/matches/f4m09qxvri1hredzcoafzbst/live',
  },
  // Round 2, November 7 — public TC Whiteboard match IDs sourced from the
  // league home listing. Live-feed path follows the provider's established URL.
  'beast-mode-vs-cougar-country-04c36978-4b61-48b4-b08f-faf455e6bc9c': {
    date: '2026-11-07',
    awayTeamId: 'ninjas',
    homeTeamId: 'kb',
    url: 'https://tcwhiteboard.com/l/cctc/matches/yaiwkus9dh41arzwgwvy0oha/live',
  },
  'dark-knights-vs-kb-159e3a72-7e0b-49c3-8cdb-f65500a11261': {
    date: '2026-11-07',
    awayTeamId: 'beast-mode',
    homeTeamId: 'dark-knights',
    url: 'https://tcwhiteboard.com/l/cctc/matches/v0hqpkvbxztjdz2u6yotr3qy/live',
  },
  'hayneous-og-s-vs-wild-turkey-e6516e83-cb71-4c97-b449-a4597d8067e8': {
    date: '2026-11-07',
    awayTeamId: 'cougar-country',
    homeTeamId: 'hayneous-og-s',
    url: 'https://tcwhiteboard.com/l/cctc/matches/g3wseyq1jmf2hu886ox8j9za/live',
  },
  // Wild Turkey at Riptide is not included: TC Whiteboard lists Nov 7,
  // while the CCTC schedule currently lists Nov 22. Resolve before linking.
  // Round 3, December 5.
  'hayneous-og-s-vs-kb-c5640100-8456-4675-abf9-4729e5a03800': {
    date: '2026-12-05',
    awayTeamId: 'hayneous-og-s',
    homeTeamId: 'beast-mode',
    url: 'https://tcwhiteboard.com/l/cctc/matches/c6igh6wv187xeooduhoad8rv/live',
  },
  'wild-turkey-vs-beast-mode-fc304831-bb4f-4eb3-bd60-b171254f6b4c': {
    date: '2026-12-05',
    awayTeamId: 'dark-knights',
    homeTeamId: 'wild-turkey',
    url: 'https://tcwhiteboard.com/l/cctc/matches/t1hk4f5ephmzhj9ofud8ki2a/live',
  },
  'cougar-country-vs-ninjas-02310df6-b95f-4265-9c69-3adc05c80a55': {
    date: '2026-12-05',
    awayTeamId: 'ninjas',
    homeTeamId: 'cougar-country',
    url: 'https://tcwhiteboard.com/l/cctc/matches/e4es0fohg98b7jdlltgwoi0c/live',
  },
  'riptide-vs-dark-knights-8aece64a-6f97-493b-9262-dd8f41e4bd94': {
    date: '2026-12-05',
    awayTeamId: 'riptide',
    homeTeamId: 'kb',
    url: 'https://tcwhiteboard.com/l/cctc/matches/z0dhgijnr96ts2evsed4y57a/live',
  },
  // Round 4, January 2.
  'cougar-country-vs-dark-knights-fc1e1e6d-13ca-4ce7-93af-eb74471df40b': {
    date: '2027-01-02',
    awayTeamId: 'beast-mode',
    homeTeamId: 'ninjas',
    url: 'https://tcwhiteboard.com/l/cctc/matches/te4eqkfa6p6n35n4un5kxqvj/live',
  },
  'kb-vs-riptide-fd88ace5-299d-4f45-81f1-22b364feee4f': {
    date: '2027-01-02',
    awayTeamId: 'cougar-country',
    homeTeamId: 'kb',
    url: 'https://tcwhiteboard.com/l/cctc/matches/uhkb7wvsvsd1qdl8kgigw9q1/live',
  },
};
/**
 * A TC Whiteboard live-feed link tied to the exact scheduled matchup and date.
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
