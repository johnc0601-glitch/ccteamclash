import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';

import {
  calculateActiveRosterStrengthFromPlayers,
  calculateConfirmedAvailableRosterStrength,
  calculateMatchLineupStrength,
  TEAM_STRENGTH_STAGE_LABELS,
} from './RosterStrength';

test('uses explicit labels for each roster-information stage', () => {
  assert.equal(TEAM_STRENGTH_STAGE_LABELS.activeRoster, 'Active Roster Strength');
  assert.equal(
    TEAM_STRENGTH_STAGE_LABELS.confirmedAvailableRoster,
    'Confirmed Available Roster Strength',
  );
  assert.equal(TEAM_STRENGTH_STAGE_LABELS.matchLineup, 'Match Lineup Strength');
});

test('does not silently drop active players with no CI', () => {
  const players = [
    player('male-fallback', {gender: 'Male', clashIndex: null}),
    player('female-fallback', {gender: 'Female', clashIndex: null}),
  ];

  const result = calculateActiveRosterStrengthFromPlayers(players);
  assert.ok(result);
  assert.equal(result.rosterPlayerCount, 2);
  assert.equal(result.playerCount, 2);
  assert.equal(result.provisionalPlayerCount, 2);
  assert.equal(result.fallbackPlayerCount, 2);
  assert.equal(result.omittedPlayerCount, 0);
  assert.equal(result.topSixCi, 762.5);
  assert.equal(result.activeRosterStrength, 762.5);
  assert.equal(result.confidence, 'Low');
});

test('preserves a current provisional CI instead of replacing it with the baseline', () => {
  const result = calculateActiveRosterStrengthFromPlayers([
    player('existing-provisional', {
      gender: 'Male',
      clashIndex: 850,
      clashIndexProvisional: true,
    }),
  ]);

  assert.ok(result);
  assert.equal(result.activeRosterStrength, 850);
  assert.equal(result.provisionalPlayerCount, 1);
  assert.equal(result.fallbackPlayerCount, 0);
});

test('uses PDGA as the fallback seed before the division baseline', () => {
  const result = calculateActiveRosterStrengthFromPlayers([
    player('pdga-fallback', {
      gender: 'Male',
      clashIndex: null,
      pdgaRating: 912,
    }),
  ]);

  assert.ok(result);
  assert.equal(result.activeRosterStrength, 912);
  assert.equal(result.provisionalPlayerCount, 1);
  assert.equal(result.fallbackPlayerCount, 1);
});

test('confirmed available strength includes only explicit Playing responses', () => {
  const players = [player('playing'), player('unconfirmed'), player('not-playing')];
  const result = calculateConfirmedAvailableRosterStrength(players, [
    {playerId: 'playing', playerName: 'Playing', teamId: 'team', status: 'Playing'},
    {playerId: 'unconfirmed', playerName: 'Unconfirmed', teamId: 'team', status: 'Unconfirmed'},
    {playerId: 'not-playing', playerName: 'Not Playing', teamId: 'team', status: 'NotPlaying'},
  ]);

  assert.ok(result);
  assert.equal(result.source, 'confirmedAvailableRoster');
  assert.equal(result.label, 'Confirmed Available Roster Strength');
  assert.equal(result.rosterPlayerCount, 1);
  assert.deepEqual(result.playerIds, ['playing']);
});

test('official lineup strength resolves immutable player ids and exposes missing data', () => {
  const roster: OfficialMatchRoster = {
    id: 'roster',
    matchId: 'match',
    teamId: 'team',
    teamNameSnapshot: 'Team',
    needsCommissionerReview: false,
    createdAt: '2026-08-27T00:00:00Z',
    updatedBy: null,
    updatedAt: '2026-08-27T00:00:00Z',
    players: [
      snapshotPlayer('known'),
      snapshotPlayer('missing'),
    ],
  };

  const result = calculateMatchLineupStrength([player('known')], roster);
  assert.ok(result);
  assert.equal(result.source, 'matchLineup');
  assert.equal(result.rosterPlayerCount, 2);
  assert.equal(result.playerCount, 1);
  assert.equal(result.omittedPlayerCount, 1);
  assert.equal(result.confidence, 'Low');
});

test('full confidence requires a complete measured player pool', () => {
  const players = Array.from({length: 18}, (_, index) =>
    player(`p-${index}`, {clashIndex: 900 + index}),
  );
  const full = calculateActiveRosterStrengthFromPlayers(players);
  assert.ok(full);
  assert.equal(full.confidence, 'Full');

  players[17] = player('p-17', {
    clashIndex: 917,
    clashIndexProvisional: true,
  });
  const partial = calculateActiveRosterStrengthFromPlayers(players);
  assert.ok(partial);
  assert.equal(partial.confidence, 'Partial');
});

function player(
  id: string,
  overrides: Partial<LaunchPlayer> = {},
): LaunchPlayer {
  return {
    id,
    name: id,
    gender: 'Male',
    pdgaNumber: '',
    pdgaRating: null,
    clashIndex: 900,
    clashIndexProvisional: false,
    currentTeamId: 'team',
    homeArea: '',
    active: true,
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
    ...overrides,
  };
}

function snapshotPlayer(playerId: string) {
  return {
    id: `snapshot-${playerId}`,
    matchId: 'match',
    teamId: 'team',
    teamNameSnapshot: 'Team',
    playerId,
    playerNameSnapshot: playerId,
    createdAt: '2026-08-27T00:00:00Z',
    updatedBy: null,
    updatedAt: '2026-08-27T00:00:00Z',
  };
}
