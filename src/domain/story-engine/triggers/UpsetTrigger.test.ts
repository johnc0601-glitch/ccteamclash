import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from '../RatedResult';
import {detectUpsets, upsetMagnitude} from './UpsetTrigger';

function result(overrides: Partial<RatedResult> = {}): RatedResult {
  return {
    id: 'r1', contestId: 'c1', matchId: 'm1', eventId: 'round-1', seasonId: '2026-27',
    format: 'Singles', side: 'Away', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: 0.24, winProbability: 0.24,
    subjectEffectiveCi: 910, opponentEffectiveCi: 980, ciDeficit: 70, ciDelta: 11,
    modelVersion: '2026-27-v1', playedAt: '2026-10-03T12:00:00Z',
    ...overrides,
  };
}

describe('UpsetTrigger', () => {
  it('creates a verified-fact draft only for wins below the upset threshold', () => {
    const candidates = detectUpsets([
      result(),
      result({id: 'r2', winProbability: 0.40}),
      result({id: 'r3', winProbability: 0.15, won: false, outcome: 'L', actualPoints: 0}),
    ]);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].id, 'upset:r1');
    assert.equal(candidates[0].triggerType, 'UPSET');
    assert.deepEqual(candidates[0].playerIds, ['p1']);
    assert.equal(candidates[0].headlineFacts.winner, 'Player One');
    assert.equal(candidates[0].headlineFacts.winProbability, 0.24);
    assert.equal(candidates[0].headlineFacts.ciDeficit, 70);
  });

  it('scales surprise from barely qualifying to maximum at a 10% chance', () => {
    assert.ok(Math.abs(upsetMagnitude(0.39) - 3.333) < 0.01);
    assert.equal(upsetMagnitude(0.25), 50);
    assert.equal(upsetMagnitude(0.10), 100);
    assert.equal(upsetMagnitude(0.05), 100);
  });
});
