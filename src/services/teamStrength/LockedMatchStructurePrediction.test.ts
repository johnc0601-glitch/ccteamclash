import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {LockedMatchStructure} from '@/domain/match-roster/MatchStructureLock';
import {calculateLockedMatchStructurePrediction} from './LockedMatchStructurePrediction';

test('complete equal neutral structure predicts 18-18 and 50 percent', () => {
  const prediction = calculateLockedMatchStructurePrediction({
    structure: fullStructure(),
    players: fullPlayers(900, 900),
    venue: 'Neutral',
  });

  assert.ok(prediction);
  assert.ok(Math.abs(prediction.homeExpectedPoints - 18) < 1e-12);
  assert.ok(Math.abs(prediction.awayExpectedPoints - 18) < 1e-12);
  assert.equal(prediction.standardPointsAccountedFor, 36);
  assert.equal(prediction.homeChanceOfVictory, 0.5);
  assert.equal(prediction.awayChanceOfVictory, 0.5);
  assert.equal(prediction.completeSinglesMatchups, 18);
  assert.equal(prediction.completeDoublesMatchups, 9);
  assert.equal(prediction.confidence, 'Full');
});

test('applies the league home effect once to actual locked matchups', () => {
  const neutral = calculateLockedMatchStructurePrediction({
    structure: fullStructure(),
    players: fullPlayers(900, 900),
    venue: 'Neutral',
  });
  const home = calculateLockedMatchStructurePrediction({
    structure: fullStructure(),
    players: fullPlayers(900, 900),
    venue: 'Home',
  });

  assert.ok(neutral && home);
  assert.ok(home.homeExpectedPoints > neutral.homeExpectedPoints);
  assert.ok(home.homeChanceOfVictory > neutral.homeChanceOfVictory);
  assert.ok(Math.abs(home.homeExpectedPoints + home.awayExpectedPoints - 36) < 1e-9);
});

test('moves an empty away singles slot from rated expectation to one home automatic point', () => {
  const structure = fullStructure();
  structure.singles[17].awayPlayerId = null;

  const prediction = calculateLockedMatchStructurePrediction({
    structure,
    players: fullPlayers(900, 900),
  });

  assert.ok(prediction);
  assert.equal(prediction.completeSinglesMatchups, 17);
  assert.equal(prediction.homeAutomaticPoints, 1);
  assert.equal(prediction.awayAutomaticPoints, 0);
  assert.equal(prediction.standardPointsAccountedFor, 36);
  assert.ok(prediction.homeChanceOfVictory > 0.5);
});

test('moves an empty away doubles pair to two home automatic points', () => {
  const structure = fullStructure();
  structure.doubles[8].awayPlayerIds = [null, null];

  const prediction = calculateLockedMatchStructurePrediction({
    structure,
    players: fullPlayers(900, 900),
  });

  assert.ok(prediction);
  assert.equal(prediction.completeDoublesMatchups, 8);
  assert.equal(prediction.homeAutomaticPoints, 2);
  assert.equal(prediction.standardPointsAccountedFor, 36);
  assert.ok(prediction.homeChanceOfVictory > 0.5);
});

test('refuses mutually empty structural slots rather than inventing points', () => {
  const structure = fullStructure();
  structure.singles[17].homePlayerId = null;
  structure.singles[17].awayPlayerId = null;

  assert.equal(
    calculateLockedMatchStructurePrediction({structure, players: fullPlayers(900, 900)}),
    undefined,
  );
});

test('uses the established new-player fallback but lowers confidence to Partial', () => {
  const players = fullPlayers(900, 900);
  players[0] = player('home-1', null, {
    pdgaRating: 912,
    gender: 'Male',
  });

  const prediction = calculateLockedMatchStructurePrediction({
    structure: fullStructure(),
    players,
  });

  assert.ok(prediction);
  assert.equal(prediction.confidence, 'Partial');
  assert.equal(prediction.provisionalPlayerCount, 1);
});

test('blocks exact prediction when an assigned player has no resolvable CI', () => {
  const players = fullPlayers(900, 900);
  players[0] = player('home-1', null, {
    pdgaRating: null,
    gender: 'Unknown',
  });

  assert.equal(
    calculateLockedMatchStructurePrediction({
      structure: fullStructure(),
      players,
    }),
    undefined,
  );
});

test('uses actual 80/20 doubles pair strength once pairings are locked', () => {
  const players = fullPlayers(900, 900);
  players[0] = player('home-1', 1000);
  players[1] = player('home-2', 800);

  const prediction = calculateLockedMatchStructurePrediction({
    structure: fullStructure(),
    players,
  });

  assert.ok(prediction);
  // 1000/800 becomes 960 under the established 80/20 pair rule, giving the
  // first home doubles pair an edge over 900/900.
  assert.ok(prediction.homeExpectedPoints > 18);
});

function fullStructure(): LockedMatchStructure {
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

function fullPlayers(homeCi: number, awayCi: number): LaunchPlayer[] {
  return [
    ...Array.from({length: 18}, (_, index) => player(`home-${index + 1}`, homeCi)),
    ...Array.from({length: 18}, (_, index) => player(`away-${index + 1}`, awayCi)),
  ];
}

function player(
  id: string,
  clashIndex: number | null,
  overrides: Partial<LaunchPlayer> = {},
): LaunchPlayer {
  return {
    id,
    name: id,
    gender: 'Male',
    pdgaNumber: '',
    pdgaRating: null,
    clashIndex,
    clashIndexProvisional: false,
    currentTeamId: id.startsWith('home-') ? 'home' : 'away',
    homeArea: '',
    active: true,
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
    ...overrides,
  };
}
