import {describe, expect, it} from 'vitest';
import {StatisticsEngine} from './StatisticsEngine';
import type {StatisticsRepository} from './StatisticsRepository';
import type {ChallengeResult} from './StatisticsTypes';

const results: ChallengeResult[] = [{
  id: 'match-1-result',
  seasonId: 'season-1',
  challengeId: 'match-1',
  date: '2026-09-12',
  homeTeamId: 'home',
  awayTeamId: 'away',
  homeScore: 1,
  awayScore: 0,
  status: 'Published',
  publishedAt: '2026-09-12T20:00:00Z',
  playerResults: [
    {
      id: 'singles:p1',
      contestId: 'singles',
      playerId: 'p1',
      playerName: 'Player One',
      teamId: 'home',
      format: 'Singles',
      outcome: 'Win',
      pointsEarned: 1,
      ciDelta: 7,
    },
    {
      id: 'singles:p2',
      contestId: 'singles',
      playerId: 'p2',
      playerName: 'Player Two',
      teamId: 'away',
      format: 'Singles',
      outcome: 'Loss',
      pointsEarned: 0,
      ciDelta: -7,
    },
  ],
}];

class CountingRepository implements StatisticsRepository {
  calls = 0;

  async getPublishedChallengeResults(): Promise<ChallengeResult[]> {
    this.calls += 1;
    return results;
  }
}

describe('StatisticsEngine player season snapshot', () => {
  it('derives statistics and CI movement from one published-result load', async () => {
    const repository = new CountingRepository();
    const engine = new StatisticsEngine(repository);

    const snapshot = await engine.getPlayerSeasonStatisticsSnapshot(['p1', 'p2'], 'season-1');

    expect(repository.calls).toBe(1);
    expect(snapshot.statistics.find((entry) => entry.playerId === 'p1')).toMatchObject({
      matchesPlayed: 1,
      overallRecord: {wins: 1, losses: 0, ties: 0},
      pointsEarned: 1,
    });
    expect(snapshot.ciMovements.get('p1')).toMatchObject({
      ciGain: 7,
      singlesCiGain: 7,
      doublesCiGain: 0,
    });
    expect(snapshot.ciMovements.get('p2')).toMatchObject({
      ciGain: -7,
      singlesCiGain: -7,
      doublesCiGain: 0,
    });
  });
});
