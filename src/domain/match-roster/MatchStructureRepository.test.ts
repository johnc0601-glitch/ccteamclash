import assert from 'node:assert/strict';
import test from 'node:test';

import type {LockedMatchStructure} from './MatchStructureLock';
import {toMatchStructureSlotRecords} from './MatchStructureRepository';

test('serializes a normalized structure to exactly 72 standard slots', () => {
  const records = toMatchStructureSlotRecords(structure());

  assert.equal(records.length, 72);
  assert.equal(
    records.filter((record) => record.format === 'Singles').length,
    36,
  );
  assert.equal(
    records.filter((record) => record.format === 'Doubles').length,
    36,
  );
  assert.deepEqual(records[0], {
    format: 'Singles',
    position: 1,
    side: 'Home',
    player_slot: 1,
    player_id: 'home-1',
  });
  assert.deepEqual(records[1], {
    format: 'Singles',
    position: 1,
    side: 'Away',
    player_slot: 1,
    player_id: 'away-1',
  });
});

test('preserves intentional null player slots', () => {
  const input = structure();
  input.singles[17].awayPlayerId = null;
  input.doubles[8].awayPlayerIds = [null, null];

  const records = toMatchStructureSlotRecords(input);

  assert.equal(
    records.find((record) =>
      record.format === 'Singles'
      && record.position === 18
      && record.side === 'Away'
    )?.player_id,
    null,
  );
  assert.deepEqual(
    records
      .filter((record) =>
        record.format === 'Doubles'
        && record.position === 9
        && record.side === 'Away'
      )
      .map((record) => record.player_id),
    [null, null],
  );
});

function structure(): LockedMatchStructure {
  return {
    matchId: 'match',
    homeTeamId: 'home',
    awayTeamId: 'away',
    status: 'Locked',
    singles: Array.from({length: 18}, (_, index) => ({
      position: index + 1,
      homePlayerId: `home-${index + 1}`,
      awayPlayerId: `away-${index + 1}`,
    })),
    doubles: Array.from({length: 9}, (_, index) => ({
      position: index + 1,
      homePlayerIds: [`home-${index * 2 + 1}`, `home-${index * 2 + 2}`] as [string | null, string | null],
      awayPlayerIds: [`away-${index * 2 + 1}`, `away-${index * 2 + 2}`] as [string | null, string | null],
    })),
    lockedBy: 'commissioner',
    lockedAt: '2026-10-03T19:00:00.000Z',
  };
}
