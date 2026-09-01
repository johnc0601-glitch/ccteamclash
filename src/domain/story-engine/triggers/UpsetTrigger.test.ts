import {describe, expect, it} from 'vitest';
import type {RatedResult} from '../RatedResult';
import {detectUpsets, upsetMagnitude} from './UpsetTrigger';

function result(overrides: Partial<RatedResult> = {}): RatedResult {
  return {
    id: 'r1', contestId: 'c1', matchId: 'm1', eventId: 'round-1', seasonId: '2026-27',
    format: 'Singles', side: 'Away', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: 0.24, winProbability: 0.24,
    subjectEffectiveCi: 910, opponentEffectiveCi: 980, ciDeficit: 70, ciDelta: 11,
    modelVersion: '2026-27-v1', playedAt: '2026-10-03T12:00:00Z',
    ...overrides,
  };
}

describe('UpsetTrigger', () => {
  it('creates a verified-fact draft only for wins below the upset threshold', () => {
    const candidates = detectUpsets([
      result(),
      result({id: 'r2', winProbability: 0.40}),
      result({id: 'r3', winProbability: 0.15, won: false, outcome: 'L', actualPoints: 0}),
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      id: 'upset:r1',
      triggerType: 'UPSET',
      playerIds: ['p1'],
      headlineFacts: {winner: 'Player One', winProbability: 0.24, ciDeficit: 70},
    });
  });

  it('scales surprise from barely qualifying to maximum at a 10% chance', () => {
    expect(upsetMagnitude(0.39)).toBeCloseTo(3.333, 2);
    expect(upsetMagnitude(0.25)).toBe(50);
    expect(upsetMagnitude(0.10)).toBe(100);
    expect(upsetMagnitude(0.05)).toBe(100);
  });
});
