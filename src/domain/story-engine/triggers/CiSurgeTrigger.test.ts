import {describe, expect, it} from 'vitest';
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
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      triggerType: 'CI_SURGE',
      eventId: 'round-5',
      headlineFacts: {player: 'Player One', contests: 3, ciGain: 20, startCi: 906, currentCi: 926},
    });
  });

  it('can select the five-contest window when it is the stronger qualifying story', () => {
    const candidates = detectCiSurges(sequentialRows([7, 7, 7, 7, 7]));
    expect(candidates[0]?.headlineFacts).toMatchObject({contests: 5, ciGain: 35, startCi: 900, currentCi: 935});
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
    expect(detectCiSurges(rows)).toEqual([]);
  });
});
