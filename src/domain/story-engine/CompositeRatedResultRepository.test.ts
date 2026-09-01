import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from './RatedResult';
import {CompositeRatedResultRepository} from './CompositeRatedResultRepository';
import {InMemoryRatedResultRepository} from './RatedResultRepository';

function row(id: string, playedAt: string): RatedResult {
  return {
    id, contestId: id, matchId: `match-${id}`, eventId: `event-${id}`, seasonId: 'season-1',
    format: 'Singles', side: 'Home', venue: 'Home', subjectPlayerIds: [`player-${id}`], subjectNames: [`Player ${id}`],
    teamId: 'team-1', teamName: 'Team One', opponentTeamId: 'team-2', opponentTeamName: 'Team Two',
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: .5, winProbability: .5,
    subjectEffectiveCi: 950, opponentEffectiveCi: 950, ciDeficit: 0, ciDelta: 5,
    modelVersion: 'test', playedAt,
  };
}

describe('CompositeRatedResultRepository', () => {
  it('merges sources into one chronological read stream', async () => {
    const repository = new CompositeRatedResultRepository([
      new InMemoryRatedResultRepository([row('new', '2026-10-01T12:00:00Z')]),
      new InMemoryRatedResultRepository([row('old', '2025-10-01T12:00:00Z')]),
    ]);
    assert.deepEqual((await repository.getRatedResults()).map((result) => result.id), ['old', 'new']);
  });

  it('rejects duplicate normalized ids across sources', async () => {
    const repository = new CompositeRatedResultRepository([
      new InMemoryRatedResultRepository([row('same', '2025-10-01T12:00:00Z')]),
      new InMemoryRatedResultRepository([row('same', '2026-10-01T12:00:00Z')]),
    ]);
    await assert.rejects(repository.getRatedResults(), /Duplicate RatedResult id/);
  });
});
