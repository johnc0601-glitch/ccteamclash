import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from './RatedResult';
import {buildStoryCandidates} from './StoryTriggerEngine';

function result(index: number, overrides: Partial<RatedResult> = {}): RatedResult {
  return {
    id: `r${index}`, contestId: `c${index}`, matchId: `m${index}`, eventId: `round-${index}`, seasonId: '2026-27',
    format: 'Singles', side: 'Away', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    subjectRatingSeedSources: ['PDGA'],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: `t-op-${index}`, opponentTeamName: `Opponent ${index}`,
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: 0.55, winProbability: 0.55,
    subjectEffectiveCi: 960, opponentEffectiveCi: 950, ciDeficit: 0, ciDelta: 4,
    modelVersion: '2026-27-v1', playedAt: `2026-10-0${index}T12:00:00Z`,
    ...overrides,
  };
}

function opponent(winner: RatedResult): RatedResult {
  return {
    ...winner,
    id: `${winner.id}-opponent`,
    side: 'Home',
    subjectPlayerIds: [`op-${winner.id}`],
    subjectNames: [`Opponent ${winner.id}`],
    subjectRatingSeedSources: ['PDGA'],
    teamId: winner.opponentTeamId,
    teamName: winner.opponentTeamName,
    opponentTeamId: winner.teamId,
    opponentTeamName: winner.teamName,
    outcome: 'L',
    won: false,
    actualPoints: 0,
    expectedPoints: 1 - winner.expectedPoints,
    winProbability: 1 - winner.winProbability,
    subjectEffectiveCi: winner.opponentEffectiveCi,
    opponentEffectiveCi: winner.subjectEffectiveCi,
    ciDeficit: -winner.ciDeficit,
    ciDelta: -winner.ciDelta,
  };
}

function contest(winner: RatedResult): RatedResult[] {
  return [winner, opponent(winner)];
}

describe('StoryTriggerEngine', () => {
  it('uses full prior history but emits only candidates from the requested activity scope', () => {
    const one = result(1);
    const two = result(2, {winProbability: 0.15, expectedPoints: 0.15, ciDeficit: 105, ciDelta: 15});
    const three = result(3, {winProbability: 0.20, expectedPoints: 0.20, ciDeficit: 85, ciDelta: 13});
    const candidates = buildStoryCandidates([
      ...contest(one), ...contest(two), ...contest(three),
    ], {kind: 'Round', eventId: 'round-3'});

    assert.equal(candidates.length, 3);
    assert.deepEqual(candidates.map((candidate) => candidate.triggerType).sort(), ['CI_SURGE', 'UPSET', 'WIN_STREAK']);
    assert.ok(candidates.every((candidate) => candidate.eventId === 'round-3'));
    assert.ok(candidates.every((candidate) => candidate.confidence === 'verified'));
    const upset = candidates.find((candidate) => candidate.triggerType === 'UPSET');
    assert.equal(upset?.contextFacts.seasonUpsetRank, 2);
    assert.equal(upset?.contextFacts.seasonUpsetTotal, 2);
    assert.equal(upset?.contextFacts.allTimeUpsetRank, 2);
    assert.equal(upset?.contextFacts.allTimeUpsetTotal, 2);

    const streak = candidates.find((candidate) => candidate.triggerType === 'WIN_STREAK');
    assert.equal(streak?.contextFacts.seasonStreakRank, 1);
    assert.equal(streak?.contextFacts.allTimeStreakRank, 1);
    assert.equal(streak?.scores.rarity, 100);
    assert.equal(streak?.scores.historicalSignificance, 100);
    assert.ok((streak?.storyScore ?? 0) >= 55);
  });

  it('cuts history off at a past round so future results cannot leak into a backtest', () => {
    const one = result(1);
    const two = result(2, {winProbability: 0.15, expectedPoints: 0.15, ciDeficit: 105, ciDelta: 15});
    const three = result(3, {winProbability: 0.08, expectedPoints: 0.08, ciDeficit: 140, ciDelta: 18});
    const candidates = buildStoryCandidates([
      ...contest(one), ...contest(two), ...contest(three),
    ], {kind: 'Round', eventId: 'round-2'});

    assert.equal(candidates.length, 2);
    assert.deepEqual(candidates.map((candidate) => candidate.triggerType).sort(), ['PERSONAL_BEST', 'UPSET']);
    const upset = candidates.find((candidate) => candidate.triggerType === 'UPSET');
    assert.equal(upset?.eventId, 'round-2');
    assert.equal(upset?.contextFacts.allTimeUpsetRank, 1);
    assert.equal(upset?.contextFacts.allTimeUpsetTotal, 1);
  });
});
