import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from '../RatedResult';
import {detectPersonalBests} from './PersonalBestTrigger';

function row(index: number, before: number, after: number): RatedResult {
  const delta = after - before;
  return {
    id: `r${index}`, contestId: `c${index}`, matchId: `m${index}`, eventId: `round-${index}`, seasonId: '2026-27',
    format: 'Singles', side: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    subjectCiBefore: [before], subjectCiAfter: [after], subjectCiDeltas: [delta],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
    outcome: delta >= 0 ? 'W' : 'L', won: delta >= 0, actualPoints: delta >= 0 ? 1 : 0,
    expectedPoints: .5, winProbability: .5, subjectEffectiveCi: before, opponentEffectiveCi: 950,
    ciDeficit: 950 - before, ciDelta: delta, modelVersion: 'test', playedAt: `2026-10-0${index}T12:00:00Z`,
  };
}

describe('detectPersonalBests', () => {
  it('detects a meaningful new career-high CI', () => {
    const candidates = detectPersonalBests([
      row(1, 920, 928),
      row(2, 928, 925),
      row(3, 925, 936),
    ]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].triggerType, 'PERSONAL_BEST');
    assert.equal(candidates[0].eventId, 'round-3');
    assert.equal(candidates[0].headlineFacts.bestType, 'CAREER_HIGH_CI');
    assert.equal(candidates[0].headlineFacts.previousBestCi, 928);
    assert.equal(candidates[0].headlineFacts.newCi, 936);
    assert.equal(candidates[0].headlineFacts.improvement, 8);
  });

  it('does not call a small incremental high a story candidate', () => {
    assert.deepEqual(detectPersonalBests([row(1, 920, 928), row(2, 928, 931)]), []);
  });

  it('does not claim a career high from a first observed result', () => {
    assert.deepEqual(detectPersonalBests([row(1, 920, 935)]), []);
  });
});
