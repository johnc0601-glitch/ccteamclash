import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from '../RatedResult';
import {detectDoublesChemistry} from './DoublesChemistryTrigger';

function doubles(index: number, overrides: Partial<RatedResult> = {}): RatedResult {
  return {
    id: `d${index}`, contestId: `c${index}`, matchId: `m${index}`, eventId: `round-${index}`, seasonId: '2026-27',
    format: 'Doubles', side: 'Home', subjectPlayerIds: ['p1', 'p2'], subjectNames: ['One', 'Two'],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: .65, winProbability: .65,
    subjectEffectiveCi: 950, opponentEffectiveCi: 940, ciDeficit: -10, ciDelta: 4,
    subjectCiBefore: [960, 930], subjectCiDeltas: [2, 2],
    modelVersion: 'test', playedAt: `2026-10-0${index}T12:00:00Z`,
    ...overrides,
  };
}

describe('detectDoublesChemistry', () => {
  it('fires when a pair first qualifies with four strong shared results', () => {
    const candidates = detectDoublesChemistry([
      doubles(1),
      doubles(2, {subjectPlayerIds: ['p2', 'p1'], subjectNames: ['Two', 'One']}),
      doubles(3),
      doubles(4),
    ]);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].triggerType, 'DOUBLES_CHEMISTRY');
    assert.deepEqual(candidates[0].playerIds, ['p1', 'p2']);
    assert.equal(candidates[0].eventId, 'round-4');
    assert.equal(candidates[0].headlineFacts.contests, 4);
    assert.equal(candidates[0].headlineFacts.wins, 4);
    assert.equal(candidates[0].headlineFacts.winRatePct, 100);
    assert.equal(candidates[0].headlineFacts.performanceVsExpected, 1.4);
    assert.equal(candidates[0].headlineFacts.qualification, 'WIN_RATE_AND_EXPECTATION');
  });

  it('does not publish the same chemistry story again while the pair remains qualified', () => {
    const candidates = detectDoublesChemistry([
      doubles(1), doubles(2), doubles(3), doubles(4), doubles(5),
    ]);
    assert.deepEqual(candidates, []);
  });

  it('can qualify by beating expectation even below a 75 percent win rate', () => {
    const rows = [1, 2, 3, 4].map((index) => doubles(index, {
      expectedPoints: .2,
      winProbability: .2,
      outcome: index <= 2 ? 'W' : 'L',
      won: index <= 2,
      actualPoints: index <= 2 ? 1 : 0,
    }));
    const candidates = detectDoublesChemistry(rows);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].headlineFacts.winRatePct, 50);
    assert.equal(candidates[0].headlineFacts.performanceVsExpected, 1.2);
    assert.equal(candidates[0].headlineFacts.qualification, 'ABOVE_EXPECTATION');
  });

  it('requires at least four shared doubles contests', () => {
    assert.deepEqual(detectDoublesChemistry([doubles(1), doubles(2), doubles(3)]), []);
  });
});
