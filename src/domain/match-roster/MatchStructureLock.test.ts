import assert from 'node:assert/strict';
import test from 'node:test';

import type {OfficialMatchRoster} from './MatchRosterSnapshot';
import {
  buildLockedMatchStructure,
  MATCH_STRUCTURE_DOUBLES_COUNT,
  MATCH_STRUCTURE_SINGLES_COUNT,
  matchStructureSlotCounts,
} from './MatchStructureLock';

test('normalizes sparse input into all 18 singles and 9 doubles positions', () => {
  const result = buildLockedMatchStructure({
    ...baseInput(),
    singles: [{position: 1, homePlayerId: 'home-1', awayPlayerId: 'away-1'}],
    doubles: [{
      position: 1,
      homePlayerIds: ['home-1', 'home-2'],
      awayPlayerIds: ['away-1', 'away-2'],
    }],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.singles.length, MATCH_STRUCTURE_SINGLES_COUNT);
  assert.equal(result.data.doubles.length, MATCH_STRUCTURE_DOUBLES_COUNT);
  assert.deepEqual(result.data.singles[1], {
    position: 2,
    homePlayerId: null,
    awayPlayerId: null,
  });
  assert.deepEqual(result.data.doubles[1], {
    position: 2,
    homePlayerIds: [null, null],
    awayPlayerIds: [null, null],
  });
});

test('allows the same player once in singles and once in doubles', () => {
  const result = buildLockedMatchStructure({
    ...baseInput(),
    singles: [{position: 1, homePlayerId: 'home-1', awayPlayerId: 'away-1'}],
    doubles: [{
      position: 1,
      homePlayerIds: ['home-1', 'home-2'],
      awayPlayerIds: ['away-1', 'away-2'],
    }],
  });

  assert.equal(result.ok, true);
});

test('rejects a player used twice within the same format', () => {
  const result = buildLockedMatchStructure({
    ...baseInput(),
    singles: [
      {position: 1, homePlayerId: 'home-1', awayPlayerId: 'away-1'},
      {position: 2, homePlayerId: 'home-1', awayPlayerId: 'away-2'},
    ],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.includes('Home singles player home-1 is assigned more than once')));
});

test('rejects a player who is not on that side official roster', () => {
  const result = buildLockedMatchStructure({
    ...baseInput(),
    singles: [{position: 1, homePlayerId: 'away-1', awayPlayerId: 'away-1'}],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((error) => error.includes('Home singles player away-1 is not on the official roster')));
});

test('permits intentionally empty locked slots and counts exact structural capacity', () => {
  const singles = Array.from({length: 17}, (_, index) => ({
    position: index + 1,
    homePlayerId: `home-${index + 1}`,
    awayPlayerId: `away-${index + 1}`,
  }));
  const doubles = Array.from({length: 8}, (_, index) => ({
    position: index + 1,
    homePlayerIds: [`home-${index * 2 + 1}`, `home-${index * 2 + 2}`] as const,
    awayPlayerIds: [`away-${index * 2 + 1}`, `away-${index * 2 + 2}`] as const,
  }));

  const result = buildLockedMatchStructure({...baseInput(), singles, doubles});
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(matchStructureSlotCounts(result.data, 'Home'), {
    singlesPlayerSlotsFilled: 17,
    doublesPlayerSlotsFilled: 16,
  });
  assert.deepEqual(matchStructureSlotCounts(result.data, 'Away'), {
    singlesPlayerSlotsFilled: 17,
    doublesPlayerSlotsFilled: 16,
  });
});

test('requires official snapshots for the scheduled teams and match', () => {
  const input = baseInput();
  const result = buildLockedMatchStructure({
    ...input,
    officialRosters: [input.officialRosters[0]],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.includes('Official away roster is unavailable.'));
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
