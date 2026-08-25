import assert from 'node:assert/strict';
import test from 'node:test';
import {ClashIndexMovement} from '@/services/statistics/ClashIndexMovement';
import type {ChallengeResult} from '@/services/statistics/StatisticsTypes';

const results: ChallengeResult[] = [
  result('season-a', 'match-a', [
    player('p1', 'contest-a', 6),
    player('p1', 'contest-b', -2),
    player('p2', 'contest-a', -6),
  ]),
  result('season-b', 'match-b', [
    player('p1', 'contest-c', 4),
  ]),
  result('season-b', 'match-c', [
    player('p1', 'contest-d'),
  ]),
];

test('season CI gain sums only earned contest deltas', () => {
  const movement = new ClashIndexMovement().calculateForSeason('p1', 'season-a', results);
  assert.deepEqual(movement, {playerId: 'p1', seasonId: 'season-a', ciGain: 4, ratedContests: 2});
});

test('career CI gain crosses season boundaries without introducing reseeds', () => {
  const movement = new ClashIndexMovement().calculateCareer('p1', results);
  assert.deepEqual(movement, {playerId: 'p1', seasonId: 'career', ciGain: 8, ratedContests: 3});
});

test('returns unavailable when no persisted rating facts exist', () => {
  const movement = new ClashIndexMovement().calculateForSeason('p3', 'season-a', results);
  assert.equal(movement, undefined);
});

function result(seasonId: string, challengeId: string, playerResults: ChallengeResult['playerResults']): ChallengeResult {
  return {
    id: `${challengeId}-result`, seasonId, challengeId, date: '2026-01-01',
    homeTeamId: 'home', awayTeamId: 'away', homeScore: 1, awayScore: 0,
    status: 'Published', playerResults, publishedAt: '2026-01-01T12:00:00Z',
  };
}

function player(playerId: string, contestId: string, ciDelta?: number): ChallengeResult['playerResults'][number] {
  return {
    id: `${contestId}:${playerId}`, playerId, playerName: playerId, teamId: 'home',
    format: 'Singles', outcome: 'Win', pointsEarned: 1, contestId,
    ...(ciDelta === undefined ? {} : {ciDelta}),
  };
}
