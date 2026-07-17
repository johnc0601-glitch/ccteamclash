import type {Player} from '@/models/Player';
import {RankingsService} from '@/services/rankings/RankingsService';
import type {
  RankingPlayerProvider,
  RankingStatisticsProvider,
} from '@/services/rankings/RankingTypes';
import type {PlayerStatistics} from '@/services/statistics';
import assert from 'node:assert/strict';
import test from 'node:test';

function createPlayer(
  id: string,
  name: string,
  gender: Player['gender'],
  pdgaRating: number | null = null,
): Player {
  return {
    id,
    name,
    teamId: 'team-1',
    pdgaNumber: pdgaRating ? String(pdgaRating + 10000) : '',
    pdgaRating,
    gender,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createStatistics(playerId: string, wins: number, winPercentage: number): PlayerStatistics {
  return {
    playerId,
    playerName: playerId,
    seasonId: 'season-1',
    teamIds: ['team-1'],
    matchesPlayed: wins || 1,
    finalsQualified: wins >= 2,
    singlesRecord: {wins, losses: 0, ties: 0},
    doublesRecord: {wins: 0, losses: 0, ties: 0},
    overallRecord: {wins, losses: 0, ties: 0},
    winPercentage,
    pointsEarned: wins,
    currentStreak: wins ? `W${wins}` : '--',
  };
}

class TestPlayerProvider implements RankingPlayerProvider {
  async getAll(): Promise<Player[]> {
    return [
      createPlayer('player-a', 'Alpha', 'Female', 850),
      createPlayer('player-b', 'Bravo', 'Male', 1050),
      createPlayer('player-c', 'Charlie', 'Female', null),
    ];
  }
}

class TestStatisticsProvider implements RankingStatisticsProvider {
  private readonly values = new Map<string, PlayerStatistics>([
    ['player-a', createStatistics('player-a', 4, 80)],
    ['player-b', createStatistics('player-b', 5, 60)],
    ['player-c', createStatistics('player-c', 4, 90)],
  ]);

  async getPlayerStatistics(playerId: string): Promise<PlayerStatistics> {
    const value = this.values.get(playerId);
    if (!value) throw new Error(`Missing statistics for ${playerId}.`);
    return value;
  }
}

test('RankingsService orders by wins, then win percentage, without using PDGA data', async () => {
  const service = new RankingsService(new TestPlayerProvider(), new TestStatisticsProvider());
  const rankings = await service.getOverallRankings('season-1');

  assert.deepEqual(
    rankings.map((entry) => [entry.rank, entry.player.id]),
    [[1, 'player-b'], [2, 'player-c'], [3, 'player-a']],
  );
});

test('RankingsService limits the womens list to female players', async () => {
  const service = new RankingsService(new TestPlayerProvider(), new TestStatisticsProvider());
  const rankings = await service.getWomensRankings('season-1');

  assert.deepEqual(rankings.map((entry) => entry.player.id), ['player-c', 'player-a']);
});
