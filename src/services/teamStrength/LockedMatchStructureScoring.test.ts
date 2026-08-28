import assert from 'node:assert/strict';
import test from 'node:test';

import type {LockedMatchStructure} from '@/domain/match-roster/MatchStructureLock';
import {analyzeLockedMatchStructure} from './LockedMatchStructureScoring';

test('a complete standard structure has no automatic points', () => {
  const analysis = analyzeLockedMatchStructure(structure());

  assert.deepEqual(analysis.homeSlots, {
    singlesPlayerSlotsFilled: 18,
    doublesPlayerSlotsFilled: 18,
  });
  assert.deepEqual(analysis.awaySlots, {
    singlesPlayerSlotsFilled: 18,
    doublesPlayerSlotsFilled: 18,
  });
  assert.equal(analysis.completeSinglesMatchups, 18);
  assert.equal(analysis.completeDoublesMatchups, 9);
  assert.deepEqual(analysis.automaticPoints, {
    home: {automaticPoints: 0},
    away: {automaticPoints: 0},
  });
});

test('an empty away singles slot becomes one exact home automatic point', () => {
  const input = structure();
  input.singles[17].awayPlayerId = null;

  const analysis = analyzeLockedMatchStructure(input);

  assert.equal(analysis.completeSinglesMatchups, 17);
  assert.deepEqual(analysis.automaticPoints, {
    home: {automaticPoints: 1},
    away: {automaticPoints: 0},
  });
});

test('an empty away doubles pair becomes two exact home automatic points', () => {
  const input = structure();
  input.doubles[8].awayPlayerIds = [null, null];

  const analysis = analyzeLockedMatchStructure(input);

  assert.equal(analysis.completeDoublesMatchups, 8);
  assert.deepEqual(analysis.automaticPoints, {
    home: {automaticPoints: 2},
    away: {automaticPoints: 0},
  });
});

test('mutual vacancies are surfaced as ambiguous instead of double-awarded', () => {
  const input = structure();
  input.singles[17].homePlayerId = null;
  input.singles[17].awayPlayerId = null;
  input.doubles[8].homePlayerIds = [null, null];
  input.doubles[8].awayPlayerIds = [null, null];

  const analysis = analyzeLockedMatchStructure(input);

  assert.deepEqual(analysis.mutualEmptySinglesPositions, [18]);
  assert.deepEqual(analysis.mutualEmptyDoublesPositions, [9]);
  assert.equal(analysis.automaticPoints, undefined);
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
