import {StatisticsEngine} from '@/services/statistics/StatisticsEngine';
import type {StatisticsRepository} from '@/services/statistics/StatisticsRepository';
import type {ChallengeResult} from '@/services/statistics/StatisticsTypes';
import assert from 'node:assert/strict';
import test from 'node:test';

const TEST_RESULTS: ChallengeResult[] = [
  {
    id: 'test-1',
    seasonId: 'season-1',
    challengeId: 'challenge-1',
    date: '2026-07-01',
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    homeScore: 20,
    awayScore: 16,
    status: 'Published',
    publishedAt: '2026-07-01T18:00:00.000Z',
    playerResults: [
      {
        id: 'player-1-singles',
        playerId: 'player-1',
        playerName: 'Player One',
        teamId: 'team-a',
        format: 'Singles',
        outcome: 'Win',
        pointsEarned: 1,
      },
      {
        id: 'player-1-doubles',
        playerId: 'player-1',
        playerName: 'Player One',
        teamId: 'team-a',
        format: 'Doubles',
        outcome: 'Tie',
        pointsEarned: 1,
      },
    ],
  },
];

class TestStatisticsRepository implements StatisticsRepository {
  async getPublishedChallengeResults(): Promise<ChallengeResult[]> {
    return TEST_RESULTS;
  }
}

test('StatisticsEngine calculates team, player, season, and head-to-head stats', async () => {
  const engine = new StatisticsEngine(new TestStatisticsRepository());
  const teamStats = await engine.getTeamStatistics('team-a', 'season-1');
  assert.equal(teamStats.record.wins, 1);
  assert.equal(teamStats.pointsPercentage, 55.6);

  const playerStats = await engine.getPlayerStatistics('player-1', 'season-1');
  assert.equal(playerStats.singlesRecord.wins, 1);
  assert.equal(playerStats.doublesRecord.ties, 1);
  assert.equal(playerStats.matchesPlayed, 1);
  assert.equal(playerStats.finalsQualified, false);

  const seasonStats = await engine.getSeasonStatistics('season-1');
  assert.equal(seasonStats.challengesPlayed, 1);

  const headToHead = await engine.getHeadToHead('team-a', 'team-b', 'season-1');
  assert.equal(headToHead.recordForTeamA.wins, 1);
});

test('Player season match tally counts challenges, not singles and doubles entries', async () => {
  const secondResult: ChallengeResult = {
    ...TEST_RESULTS[0],
    id: 'test-2',
    challengeId: 'challenge-2',
    date: '2026-07-15',
    playerResults: [{
      id: 'player-1-second-match',
      playerId: 'player-1',
      playerName: 'Player One',
      teamId: 'team-a',
      format: 'Singles',
      outcome: 'Loss',
      pointsEarned: 0,
    }],
  };
  const engine = new StatisticsEngine({
    async getPublishedChallengeResults() {
      return [...TEST_RESULTS, secondResult];
    },
  });

  const playerStats = await engine.getPlayerStatistics('player-1', 'season-1');

  assert.equal(playerStats.matchesPlayed, 2);
  assert.equal(playerStats.finalsQualified, true);
});
