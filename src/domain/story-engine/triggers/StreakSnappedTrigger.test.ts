import {describe, expect, it} from 'vitest';
import type {RatedResult} from '../RatedResult';
import {detectStreaksSnapped} from './StreakSnappedTrigger';

function row(index: number, outcome: RatedResult['outcome']): RatedResult {
  return {
    id: `r${index}`, contestId: `c${index}`, matchId: `m${index}`, eventId: `round-${index}`, seasonId: '2026-27',
    format: 'Singles', side: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
    outcome, won: outcome === 'W', actualPoints: outcome === 'W' ? 1 : outcome === 'T' ? .5 : 0,
    expectedPoints: .5, winProbability: .5, subjectEffectiveCi: 950, opponentEffectiveCi: 950,
    ciDeficit: 0, ciDelta: outcome === 'W' ? 5 : -5, modelVersion: 'test',
    playedAt: `2026-10-0${index}T12:00:00Z`,
  };
}

describe('detectStreaksSnapped', () => {
  it('detects a qualifying streak ending with a loss', () => {
    const candidates = detectStreaksSnapped([row(1, 'W'), row(2, 'W'), row(3, 'W'), row(4, 'L')]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      triggerType: 'STREAK_SNAPPED',
      eventId: 'round-4',
      headlineFacts: {player: 'Player One', format: 'Singles', snappedStreak: 3, breakerOutcome: 'L'},
    });
  });

  it('treats a tie as ending the streak', () => {
    const candidates = detectStreaksSnapped([row(1, 'W'), row(2, 'W'), row(3, 'W'), row(4, 'T')]);
    expect(candidates[0]?.headlineFacts.breakerOutcome).toBe('T');
  });

  it('ignores a run shorter than the publication candidate threshold', () => {
    expect(detectStreaksSnapped([row(1, 'W'), row(2, 'W'), row(3, 'L')])).toEqual([]);
  });
});
