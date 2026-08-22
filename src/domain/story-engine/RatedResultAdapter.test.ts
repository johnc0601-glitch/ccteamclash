import {describe, expect, it} from 'vitest';
import {ratedResultToStoryFact} from './RatedResultAdapter';
import type {RatedResult} from './RatedResult';

const result: RatedResult = {
  id: 'c1:away', contestId: 'c1', matchId: 'm1', eventId: 'round-1', seasonId: '2026-27',
  format: 'Doubles', side: 'Away', subjectPlayerIds: ['p1', 'p2'], subjectNames: ['Jon', 'Sam'],
  teamId: 't1', teamName: 'Wild Turkey', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
  outcome: 'W', won: true, actualPoints: 1, expectedPoints: 0.27, winProbability: 0.27,
  subjectEffectiveCi: 912, opponentEffectiveCi: 995, ciDeficit: 83, ciDelta: 8,
  modelVersion: '2026-27-v1-home15-doubles80-20', playedAt: '2026-09-01T12:00:00Z',
};

describe('RatedResultAdapter', () => {
  it('preserves the fields required by every story ranking', () => {
    expect(ratedResultToStoryFact(result)).toEqual({
      id: 'c1:away', matchId: 'm1', eventId: 'round-1', seasonId: '2026-27', format: 'Doubles',
      subjectNames: ['Jon', 'Sam'], teamName: 'Wild Turkey', opponentTeamName: 'Dark Knights', side: 'Away',
      winProbability: 0.27, ciDeficit: 83, ciDelta: 8, expectedPoints: 0.27, actualPoints: 1, won: true,
    });
  });
});
