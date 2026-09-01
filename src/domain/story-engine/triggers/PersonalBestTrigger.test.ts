import {describe, expect, it} from 'vitest';
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
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      triggerType: 'PERSONAL_BEST',
      eventId: 'round-3',
      headlineFacts: {bestType: 'CAREER_HIGH_CI', previousBestCi: 928, newCi: 936, improvement: 8},
    });
  });

  it('does not call a small incremental high a story candidate', () => {
    expect(detectPersonalBests([row(1, 920, 928), row(2, 928, 931)])).toEqual([]);
  });

  it('does not claim a career high from a first observed result', () => {
    expect(detectPersonalBests([row(1, 920, 935)])).toEqual([]);
  });
});
