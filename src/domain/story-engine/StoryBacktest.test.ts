import {describe, expect, it} from 'vitest';
import type {RatedResult} from './RatedResult';
import {backtestStoryEngine} from './StoryBacktest';

function result(index: number, overrides: Partial<RatedResult> = {}): RatedResult {
  return {
    id: `r${index}`, contestId: `c${index}`, matchId: `m${index}`, eventId: `round-${index}`, seasonId: '2026-27',
    format: 'Singles', side: 'Away', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: 0.55, winProbability: 0.55,
    subjectEffectiveCi: 960, opponentEffectiveCi: 950, ciDeficit: 0, ciDelta: 4,
    modelVersion: '2026-27-v1', playedAt: `2026-10-0${index}T12:00:00Z`,
    ...overrides,
  };
}

describe('StoryBacktest', () => {
  it('replays each round with only the story candidates that existed at that point in time', () => {
    const backtest = backtestStoryEngine([
      result(1),
      result(2, {winProbability: 0.15, expectedPoints: 0.15, ciDeficit: 105, ciDelta: 15}),
      result(3, {winProbability: 0.20, expectedPoints: 0.20, ciDeficit: 85, ciDelta: 13}),
    ], '2026-27');

    expect(backtest.rounds.map((round) => round.candidates.length)).toEqual([0, 2, 3]);
    expect(backtest.countsByTrigger).toEqual({
      UPSET: 2,
      PERSONAL_BEST: 1,
      CI_SURGE: 1,
      WIN_STREAK: 1,
    });
    const roundTwoUpset = backtest.rounds[1].candidates.find((candidate) => candidate.triggerType === 'UPSET');
    const roundThreeUpset = backtest.rounds[2].candidates.find((candidate) => candidate.triggerType === 'UPSET');
    expect(roundTwoUpset?.contextFacts).toMatchObject({allTimeUpsetRank: 1, allTimeUpsetTotal: 1});
    expect(roundThreeUpset?.contextFacts).toMatchObject({allTimeUpsetRank: 2, allTimeUpsetTotal: 2});
    expect(backtest.rounds[2].candidates.map((candidate) => candidate.triggerType).sort())
      .toEqual(['CI_SURGE', 'UPSET', 'WIN_STREAK']);
  });
});
