import type {ChallengeResult} from '@/services/statistics/StatisticsTypes';

export interface StatisticsRepository {
  getPublishedChallengeResults(): Promise<ChallengeResult[]>;
}

const CHALLENGE_RESULTS = [
  {
    id: 'spring-2026-opener-result',
    seasonId: 'spring-team-clash-2026',
    challengeId: 'spring-2026-opener',
    date: '2026-02-07',
    homeTeamId: 'chain-hawks',
    awayTeamId: 'ninjas',
    homeScore: 20,
    awayScore: 16,
    status: 'Published',
    publishedAt: '2026-02-08T12:00:00.000Z',
    playerResults: [
      {
        id: 'spring-2026-opener-ch-avery-singles',
        playerId: 'avery-mills',
        playerName: 'Avery Mills',
        teamId: 'chain-hawks',
        format: 'Singles',
        outcome: 'Win',
        pointsEarned: 1,
      },
      {
        id: 'spring-2026-opener-nj-riley-singles',
        playerId: 'riley-carter',
        playerName: 'Riley Carter',
        teamId: 'ninjas',
        format: 'Singles',
        outcome: 'Loss',
        pointsEarned: 0,
      },
      {
        id: 'spring-2026-opener-ch-avery-doubles',
        playerId: 'avery-mills',
        playerName: 'Avery Mills',
        teamId: 'chain-hawks',
        format: 'Doubles',
        outcome: 'Win',
        pointsEarned: 2,
      },
      {
        id: 'spring-2026-opener-nj-riley-doubles',
        playerId: 'riley-carter',
        playerName: 'Riley Carter',
        teamId: 'ninjas',
        format: 'Doubles',
        outcome: 'Loss',
        pointsEarned: 0,
      },
    ],
  },
  {
    id: 'summer-2026-dark-ninjas-result',
    seasonId: 'summer-team-clash-2026',
    challengeId: 'summer-2026-r1-dark-ninjas',
    date: '2026-07-18',
    homeTeamId: 'dark-knights',
    awayTeamId: 'ninjas',
    homeScore: 19,
    awayScore: 17,
    status: 'Published',
    publishedAt: '2026-07-18T20:00:00.000Z',
    playerResults: [
      {
        id: 'summer-2026-dark-ninjas-joshua-singles',
        playerId: 'joshua-matheson',
        playerName: 'Joshua Matheson',
        teamId: 'dark-knights',
        format: 'Singles',
        outcome: 'Win',
        pointsEarned: 1,
      },
      {
        id: 'summer-2026-dark-ninjas-william-singles',
        playerId: 'william-deering',
        playerName: 'William Deering',
        teamId: 'ninjas',
        format: 'Singles',
        outcome: 'Loss',
        pointsEarned: 0,
      },
      {
        id: 'summer-2026-dark-ninjas-joshua-doubles',
        playerId: 'joshua-matheson',
        playerName: 'Joshua Matheson',
        teamId: 'dark-knights',
        format: 'Doubles',
        outcome: 'Tie',
        pointsEarned: 1,
      },
      {
        id: 'summer-2026-dark-ninjas-william-doubles',
        playerId: 'william-deering',
        playerName: 'William Deering',
        teamId: 'ninjas',
        format: 'Doubles',
        outcome: 'Tie',
        pointsEarned: 1,
      },
    ],
  },
] as const satisfies readonly ChallengeResult[];

function cloneResult(result: ChallengeResult): ChallengeResult {
  return {
    ...result,
    playerResults: result.playerResults.map((playerResult) => ({...playerResult})),
  };
}

export class MockStatisticsRepository implements StatisticsRepository {
  private readonly results: ChallengeResult[] = CHALLENGE_RESULTS.map(cloneResult);

  async getPublishedChallengeResults(): Promise<ChallengeResult[]> {
    return this.results
      .filter((result) => result.status === 'Published')
      .map(cloneResult);
  }
}
