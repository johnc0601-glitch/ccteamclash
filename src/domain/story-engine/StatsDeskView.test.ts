import {describe, expect, it} from 'vitest';
import type {RatedResult} from './RatedResult';
import {buildStatsDeskView} from './StatsDeskView';

const base: RatedResult = {
  id: 'r1', contestId: 'c1', matchId: 'm1', eventId: 'round-1', seasonId: '2026-27',
  format: 'Singles', side: 'Away', subjectPlayerIds: ['p1'], subjectNames: ['Jon'],
  teamId: 't1', teamName: 'Wild Turkey', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
  outcome: 'W', won: true, actualPoints: 1, expectedPoints: 0.2, winProbability: 0.2,
  subjectEffectiveCi: 900, opponentEffectiveCi: 1000, ciDeficit: 100, ciDelta: 12,
  modelVersion: 'test', playedAt: '2026-10-01T12:00:00Z',
};

describe('buildStatsDeskView', () => {
  it('builds all desk outputs from the same normalized rated results', () => {
    const view = buildStatsDeskView([base], {kind: 'Round', eventId: 'round-1'});
    expect(view.ratedResultCount).toBe(1);
    expect(view.categories.find((category) => category.id === 'upsets')?.rows[0].subjectNames).toEqual(['Jon']);
    expect(view.playerExpectation[0].performanceVsExpected).toBeCloseTo(0.8);
    expect(view.teamExpectation[0].teamName).toBe('Wild Turkey');
  });

  it('applies scope once to rankings and expectation tables', () => {
    const later = {...base, id: 'r2', contestId: 'c2', matchId: 'm2', eventId: 'round-2', subjectNames: ['Phil']};
    const view = buildStatsDeskView([base, later], {kind: 'Round', eventId: 'round-1'});
    expect(view.ratedResultCount).toBe(1);
    expect(view.playerExpectation.some((row) => row.subjectName === 'Phil')).toBe(false);
  });
});
