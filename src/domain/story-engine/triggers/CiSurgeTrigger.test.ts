import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from '../RatedResult';
import {detectCiSurges} from './CiSurgeTrigger';

function row(index: number, delta: number, overrides: Partial<RatedResult> = {}): RatedResult {
  const before = 900 + Array.from({length: index - 1}, () => 0).reduce((sum) => sum, 0);
  return {
    id: `r${index}`, contestId: `c${index}`, matchId: `m${index}`, eventId: `round-${index}`, seasonId: '2026-27',
    format: 'Singles', side: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: .5, winProbability: .5,
    subjectEffectiveCi: before, opponentEffectiveCi: 950, ciDeficit: 50, ciDelta: delta,
    subjectCiBefore: [before], subjectCiAfter: [before + delta], subjectCiDeltas: [delta],
    modelVersion: 'test', playedAt: `2026-10-0${index}T12:00:00Z`,
    ...overrides,
  };
}

function sequentialRows(deltas: number[]): RatedResult[] {
  let ci = 900;
  return deltas.map((delta, offset) => {
    const index = offset + 1;
    const result = row(index, delta, {
      subjectEffectiveCi: ci,
      subjectCiBefore: [ci],
      subjectCiAfter: [ci + delta],
      subjectCiDeltas: [delta],
    });
    ci += delta;
    return result;
  });
}

describe('detectCiSurges', () => {
  it('detects a 20-point gain across the latest three rated contests', () => {
    const candidates = detectCiSurges(sequentialRows([2, 4, 7, 7, 6]));
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].triggerType, 'CI_SURGE');
    assert.equal(candidates[0].eventId, 'round-5');
    assert.equal(candidates[0].headlineFacts.player, 'Player One');
    assert.equal(candidates[0].headlineFacts.contests, 3);
    assert.equal(candidates[0].headlineFacts.ciGain, 20);
    assert.equal(candidates[0].headlineFacts.startCi, 906);
    assert.equal(candidates[0].headlineFacts.currentCi, 926);
  });

  it('can select the five-contest window when it is the stronger qualifying story', () => {
    const candidates = detectCiSurges(sequentialRows([7, 7, 7, 7, 7]));
    assert.equal(candidates[0]?.headlineFacts.contests, 5);
    assert.equal(candidates[0]?.headlineFacts.ciGain, 35);
    assert.equal(candidates[0]?.headlineFacts.startCi, 900);
    assert.equal(candidates[0]?.headlineFacts.currentCi, 935);
  });

  it('does not create a surge from aggregate doubles movement without player snapshots', () => {
    const rows = sequentialRows([8, 8]);
    rows.push(row(3, 20, {
      format: 'Doubles',
      subjectPlayerIds: ['p1', 'p2'],
      subjectNames: ['Player One', 'Player Two'],
      subjectCiBefore: undefined,
      subjectCiAfter: undefined,
      subjectCiDeltas: undefined,
    }));
    assert.deepEqual(detectCiSurges(rows), []);
  });
});
