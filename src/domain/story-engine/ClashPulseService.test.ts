import {describe, expect, it} from 'vitest';
import type {RatedResult} from './RatedResult';
import {InMemoryRatedResultRepository} from './RatedResultRepository';
import {ClashPulseService} from './ClashPulseService';

function row(index: number, overrides: Partial<RatedResult> = {}): RatedResult {
  return {
    id: `r${index}`, contestId: `c${index}`, matchId: `m${index}`, eventId: `round-${index}`, seasonId: 'season-1',
    seasonName: 'Season One', eventLabel: `Round ${index}`, eventOrder: index,
    format: 'Singles', side: 'Away', venue: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    teamId: 't1', teamName: 'Team One', opponentTeamId: 't2', opponentTeamName: 'Team Two',
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: .5, winProbability: .5,
    subjectEffectiveCi: 900 + index * 5, opponentEffectiveCi: 950, ciDeficit: 50 - index * 5, ciDelta: 7,
    subjectCiBefore: [900 + (index - 1) * 7], subjectCiAfter: [900 + index * 7], subjectCiDeltas: [7],
    modelVersion: 'test', playedAt: `2026-10-0${index}T12:00:00Z`,
    ...overrides,
  };
}

describe('ClashPulseService', () => {
  it('returns scoped candidates from repository data', async () => {
    const service = new ClashPulseService(new InMemoryRatedResultRepository([
      row(1), row(2), row(3, {winProbability: .20, expectedPoints: .20, ciDeficit: 90}),
    ]));
    const candidates = await service.getCandidates({kind: 'Round', eventId: 'round-3'});
    expect(candidates.map((candidate) => candidate.triggerType).sort()).toEqual(['CI_SURGE', 'UPSET', 'WIN_STREAK']);
  });

  it('summarizes available seasons and events without mutating data', async () => {
    const service = new ClashPulseService(new InMemoryRatedResultRepository([
      row(1), row(2), row(3),
      row(4, {seasonId: 'season-2', seasonName: 'Season Two', eventId: 's2-round-1', eventLabel: 'Round 1'}),
    ]));
    expect(await service.getSeasonSummaries()).toEqual([
      {seasonId: 'season-1', seasonName: 'Season One', resultRows: 3, events: 3},
      {seasonId: 'season-2', seasonName: 'Season Two', resultRows: 1, events: 1},
    ]);
  });
});
