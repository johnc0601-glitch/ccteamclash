import {describe, expect, it} from 'vitest';
import type {RatedResult} from './RatedResult';
import {buildStoryCandidates} from './StoryTriggerEngine';

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

describe('StoryTriggerEngine', () => {
  it('combines independent trigger detectors into one stable ranked candidate feed', () => {
    const candidates = buildStoryCandidates([
      result(1),
      result(2, {winProbability: 0.20, expectedPoints: 0.20, ciDeficit: 85, ciDelta: 13}),
      result(3),
    ]);

    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.triggerType)).toEqual(['UPSET', 'WIN_STREAK']);
    expect(candidates.every((candidate) => candidate.confidence === 'verified')).toBe(true);
  });
});
