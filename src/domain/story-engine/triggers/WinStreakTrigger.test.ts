import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from '../RatedResult';
import {detectWinStreaks} from './WinStreakTrigger';

function result(index: number, overrides: Partial<RatedResult> = {}): RatedResult {
  const day = String(index + 1).padStart(2, '0');
  return {
    id: `r${index}`, contestId: `c${index}`, matchId: `m${index}`, eventId: `round-${index}`, seasonId: '2026-27',
    format: 'Singles', side: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: 0.55, winProbability: 0.55,
    subjectEffectiveCi: 960, opponentEffectiveCi: 950, ciDeficit: 0, ciDelta: 4,
    modelVersion: '2026-27-v1', playedAt: `2026-10-${day}T12:00:00Z`,
    ...overrides,
  };
}

describe('WinStreakTrigger', () => {
  it('detects the current three-win streak after an earlier loss', () => {
    const candidates = detectWinStreaks([
      result(1, {won: false, outcome: 'L', actualPoints: 0}),
      result(2), result(3), result(4),
    ]);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].triggerType, 'WIN_STREAK');
    assert.deepEqual(candidates[0].playerIds, ['p1']);
    assert.equal(candidates[0].headlineFacts.player, 'Player One');
    assert.equal(candidates[0].headlineFacts.format, 'Singles');
    assert.equal(candidates[0].headlineFacts.streakLength, 3);
  });

  it('does not publish a streak candidate after the latest contest breaks it', () => {
    const candidates = detectWinStreaks([
      result(1), result(2), result(3),
      result(4, {won: false, outcome: 'L', actualPoints: 0}),
    ]);
    assert.deepEqual(candidates, []);
  });

  it('keeps singles and doubles streaks separate', () => {
    const candidates = detectWinStreaks([
      result(1),
      result(2),
      result(3, {
        format: 'Doubles',
        subjectPlayerIds: ['p1', 'p2'],
        subjectNames: ['Player One', 'Player Two'],
      }),
    ]);
    assert.deepEqual(candidates, []);
  });

  it('creates separate player candidates for a doubles streak', () => {
    const doubles = [1, 2, 3].map((index) => result(index, {
      format: 'Doubles',
      subjectPlayerIds: ['p1', 'p2'],
      subjectNames: ['Player One', 'Player Two'],
    }));
    const candidates = detectWinStreaks(doubles);
    assert.deepEqual(candidates.map((candidate) => candidate.playerIds[0]), ['p1', 'p2']);
    assert.ok(candidates.every((candidate) => candidate.headlineFacts.streakLength === 3));
  });
});
