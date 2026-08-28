import assert from 'node:assert/strict';
import test from 'node:test';

import type {OfficialMatchRoster} from './MatchRosterSnapshot';
import type {LockedMatchStructure} from './MatchStructureLock';
import type {MatchStructureRepository} from './MatchStructureRepository';
import {MatchStructureService} from './MatchStructureService';

class MemoryRepository implements MatchStructureRepository {
  stored: LockedMatchStructure | undefined;

  async getLocked(matchId: string): Promise<LockedMatchStructure | undefined> {
    return this.stored?.matchId === matchId ? this.stored : undefined;
  }

  async saveLocked(structure: LockedMatchStructure): Promise<void> {
    if (this.stored) throw new Error('already locked');
    this.stored = structure;
  }
}

test('validates against official rosters before persisting', async () => {
  const repository = new MemoryRepository();
  const service = new MatchStructureService(repository);

  const result = await service.lock({
    ...baseInput(),
    singles: [{position: 1, homePlayerId: 'away-1', awayPlayerId: 'away-1'}],
  });

  assert.equal(result.ok, false);
  assert.equal(repository.stored, undefined);
});

test('persists a normalized immutable structure after validation', async () => {
  const repository = new MemoryRepository();
  const service = new MatchStructureService(repository);

  const result = await service.lock({
    ...baseInput(),
    singles: [{position: 1, homePlayerId: 'home-1', awayPlayerId: 'away-1'}],
    doubles: [{
      position: 1,
      homePlayerIds: ['home-1', 'home-2'],
      awayPlayerIds: ['away-1', 'away-2'],
    }],
  });

  assert.equal(result.ok, true);
  assert.ok(repository.stored);
  assert.equal(repository.stored?.singles.length, 18);
  assert.equal(repository.stored?.doubles.length, 9);
  assert.equal(await service.getLocked('match-1'), repository.stored);
});

function baseInput() {
  return {
    matchId: 'match-1',
    homeTeamId: 'home',
    awayTeamId: 'away',
    officialRosters: [roster('home'), roster('away')],
    lockedBy: 'commissioner',
    lockedAt: '2026-10-03T19:00:00.000Z',
  };
}

function roster(teamId: string): OfficialMatchRoster {
  return {
    id: `roster-${teamId}`,
    matchId: 'match-1',
    teamId,
    teamNameSnapshot: teamId,
    needsCommissionerReview: false,
    createdAt: '2026-10-03T19:00:00.000Z',
    updatedBy: null,
    updatedAt: '2026-10-03T19:00:00.000Z',
    players: Array.from({length: 18}, (_, index) => ({
      id: `${teamId}-snapshot-${index + 1}`,
      matchId: 'match-1',
      teamId,
      teamNameSnapshot: teamId,
      playerId: `${teamId}-${index + 1}`,
      playerNameSnapshot: `${teamId}-${index + 1}`,
      createdAt: '2026-10-03T19:00:00.000Z',
      updatedBy: null,
      updatedAt: '2026-10-03T19:00:00.000Z',
    })),
  };
}
