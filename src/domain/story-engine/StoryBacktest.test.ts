import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from './RatedResult';
import {backtestStoryEngine} from './StoryBacktest';

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

describe('StoryBacktest', () => {
  it('replays each round with only the story candidates that existed at that point in time', () => {
    const one = result(1);
    const two = result(2, {winProbability: 0.15, expectedPoints: 0.15, ciDeficit: 105, ciDelta: 15});
    const three = result(3, {winProbability: 0.20, expectedPoints: 0.20, ciDeficit: 85, ciDelta: 13});
    const backtest = backtestStoryEngine([
      ...contest(one), ...contest(two), ...contest(three),
    ], '2026-27');

    assert.deepEqual(backtest.rounds.map((round) => round.candidates.length), [0, 2, 3]);
    assert.deepEqual(backtest.countsByTrigger, {
      UPSET: 2,
      PERSONAL_BEST: 1,
      CI_SURGE: 1,
      WIN_STREAK: 1,
    });
    const roundTwoUpset = backtest.rounds[1].candidates.find((candidate) => candidate.triggerType === 'UPSET');
    const roundThreeUpset = backtest.rounds[2].candidates.find((candidate) => candidate.triggerType === 'UPSET');
    assert.equal(roundTwoUpset?.contextFacts.allTimeUpsetRank, 1);
    assert.equal(roundTwoUpset?.contextFacts.allTimeUpsetTotal, 1);
    assert.equal(roundThreeUpset?.contextFacts.allTimeUpsetRank, 2);
    assert.equal(roundThreeUpset?.contextFacts.allTimeUpsetTotal, 2);
    assert.deepEqual(
      backtest.rounds[2].candidates.map((candidate) => candidate.triggerType).sort(),
      ['CI_SURGE', 'UPSET', 'WIN_STREAK'],
    );
  });
});
