import {describe, expect, it} from 'vitest';
import {buildDoublesRatingFacts, buildSinglesRatingFact, type RatedContestPlayer} from './ContestRatingFact';
import {formatClashIndex} from './ClashIndexSource';
import {buildRatingPublicationPlan} from './RatingPublicationPlan';
import {buildStoryRankings, type StoryFact} from './StoryRankings';
import type {MatchRatingSnapshot} from './MatchRatingSnapshot';

function rated(id: string, ci: number, side: 'Home' | 'Away'): RatedContestPlayer {
  return {playerId: id, teamId: `${side}-team`, playerName: id, teamName: `${side} Team`, side, clashIndexBefore: ci};
}

function story(id: string, overrides: Partial<StoryFact> = {}): StoryFact {
  return {
    id, matchId: 'm1', eventId: 'r1', seasonId: 's1', format: 'Singles', subjectNames: [id],
    teamName: 'Away', opponentTeamName: 'Home', side: 'Away', winProbability: .4,
    ciDeficit: 25, ciDelta: 5, expectedPoints: .4, actualPoints: 1, won: true, ...overrides,
  };
}

describe('story engine edge cases', () => {
  it('scores ties as half a point and never ranks them as wins or favorite losses', () => {
    const fact = buildSinglesRatingFact({contestId: 'c1', matchId: 'm1', player: rated('p1', 900, 'Away'), opponent: rated('p2', 900, 'Home'), outcome: 'T', ciDelta: 0});
    expect(fact.actualPoints).toBe(.5);
    const rankings = buildStoryRankings([story('tie', {actualPoints: .5, won: false, winProbability: .7})]);
    expect(rankings.upsetWins).toHaveLength(0);
    expect(rankings.favoriteLosses).toHaveLength(0);
  });

  it('uses the same doubles pair probability for both partners even with a lopsided pair', () => {
    const facts = buildDoublesRatingFacts({contestId: 'd1', matchId: 'm1', players: [rated('star', 1000, 'Away'), rated('ghost', 800, 'Away')], opponents: [rated('o1', 910, 'Home'), rated('o2', 900, 'Home')], outcome: 'W', ciDeltas: [4, 7]});
    expect(facts[0].winProbability).toBe(facts[1].winProbability);
    expect(facts[0].opponentEffectiveCi).toBe(facts[1].opponentEffectiveCi);
  });

  it('keeps ghost display provenance independent from the numeric CI', () => {
    expect(formatClashIndex(850, 'GhostAverage')).toBe('850*');
    expect(formatClashIndex(850, 'Established')).toBe('850');
  });

  it('aggregates singles plus doubles deltas from one frozen starting CI', () => {
    const snapshot: MatchRatingSnapshot = {matchId: 'm1', playerId: 'p1', teamId: 'Away-team', playerName: 'p1', teamName: 'Away Team', side: 'Away', clashIndexBefore: 900, ciSourceBefore: 'Established', algorithmVersion: 'v1', capturedAt: '2026-08-22T12:00:00Z'};
    const base = {matchId: 'm1', playerId: 'p1', teamId: 'Away-team', playerName: 'p1', teamName: 'Away Team', side: 'Away' as const, clashIndexBefore: 900, outcome: 'W' as const, opponentEffectiveCi: 920, winProbability: .45, actualPoints: 1, expectedPoints: .45, performanceVsExpected: .55, algorithmVersion: 'v1', calculatedAt: '2026-08-22T13:00:00Z'};
    const facts = [
      {...base, contestId: 's1', format: 'Singles' as const, ciDelta: 6, clashIndexAfter: 906},
      {...base, contestId: 'd1', format: 'Doubles' as const, ciDelta: 4, clashIndexAfter: 904},
    ];
    const plan = buildRatingPublicationPlan({matchId: 'm1', snapshots: [snapshot], facts});
    expect(plan.playerUpdates[0]).toEqual({playerId: 'p1', clashIndexBefore: 900, totalDelta: 10, clashIndexAfter: 910});
  });

  it('keeps repeat opponents as separate contests while de-duping only the same contest in matchup rankings', () => {
    const rows = buildStoryRankings([
      story('c1:away', {matchId: 'm1', winProbability: .3}),
      story('c2:away', {matchId: 'm2', winProbability: .35}),
    ]).upsetWins;
    expect(rows.map((row) => row.id)).toEqual(['c1:away', 'c2:away']);
  });
});
