import {describe, expect, it} from 'vitest';
import type {ContestRatingFact} from './ContestRatingFact';
import type {MatchRatingSnapshot} from './MatchRatingSnapshot';
import {buildRatingPublicationPlan} from './RatingPublicationPlan';

const snapshot: MatchRatingSnapshot = {
  matchId: 'm1', playerId: 'p1', teamId: 't1', playerName: 'Player', teamName: 'Team', side: 'Home',
  clashIndexBefore: 850, ciSourceBefore: 'GhostAverage', algorithmVersion: 'v1', capturedAt: '2026-08-22T12:00:00Z',
};

function fact(contestId: string, delta: number): ContestRatingFact {
  return {
    contestId, matchId: 'm1', playerId: 'p1', teamId: 't1', playerName: 'Player', teamName: 'Team', side: 'Home',
    clashIndexBefore: 850, format: 'Singles', outcome: 'W', opponentEffectiveCi: 900, winProbability: .4,
    actualPoints: 1, expectedPoints: .4, performanceVsExpected: .6, ciDelta: delta,
    algorithmVersion: 'v1', calculatedAt: '2026-08-22T13:00:00Z',
  };
}

describe('buildRatingPublicationPlan', () => {
  it('aggregates multiple same-Matchday deltas from one frozen starting CI', () => {
    const plan = buildRatingPublicationPlan({matchId: 'm1', snapshots: [snapshot], facts: [fact('c1', 7), fact('c2', 5)]});
    expect(plan.playerUpdates[0]).toEqual({playerId: 'p1', clashIndexBefore: 850, totalDelta: 12, clashIndexAfter: 862});
  });

  it('rejects facts calculated from a moving in-match CI', () => {
    const invalid = {...fact('c2', 5), clashIndexBefore: 857};
    expect(() => buildRatingPublicationPlan({matchId: 'm1', snapshots: [snapshot], facts: [fact('c1', 7), invalid]}))
      .toThrow('frozen match CI');
  });

  it('rejects mixed model versions before persistence', () => {
    const invalid = {...fact('c1', 7), algorithmVersion: 'v2'};
    expect(() => buildRatingPublicationPlan({matchId: 'm1', snapshots: [snapshot], facts: [invalid]}))
      .toThrow('mixed model versions');
  });
});
