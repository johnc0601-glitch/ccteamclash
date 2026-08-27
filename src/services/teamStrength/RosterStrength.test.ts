import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';

import {
  calculateActiveRosterStrengthFromPlayers,
  calculateConfirmedAvailableRosterStrength,
  calculateMatchLineupStrength,
  STANDARD_MATCH_PLAYER_COUNT,
  TEAM_STRENGTH_STAGE_LABELS,
} from './RosterStrength';

test('uses explicit labels for each roster-information stage', () => {
  assert.equal(TEAM_STRENGTH_STAGE_LABELS.activeRoster, 'Active Roster Strength');
  assert.equal(
    TEAM_STRENGTH_STAGE_LABELS.confirmedAvailableRoster,
    'Confirmed Available Roster Strength',
  );
  assert.equal(TEAM_STRENGTH_STAGE_LABELS.matchLineup, 'Match Lineup Strength');
  assert.equal(STANDARD_MATCH_PLAYER_COUNT, 18);
});

test('uses a stage-neutral baseStrength field instead of activeRosterStrength', () => {
  const result = calculateActiveRosterStrengthFromPlayers([player('p-1')]);
  assert.ok(result);
  assert.equal(result.baseStrength, 900);
  assert.equal('activeRosterStrength' in result, false);
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
  assert.equal(result.femalePlayerCount, 1);
  assert.equal(result.malePlayerCount, 1);
  assert.equal(result.unknownGenderPlayerCount, 0);
  assert.equal(result.standardPlayerShortfall, 16);
  assert.equal(result.topSixCi, 762.5);
  assert.equal(result.baseStrength, 762.5);
  assert.equal(result.confidence, 'Low');
});

test('captures gender composition from selected players independently of CI resolution', () => {
  const result = calculateActiveRosterStrengthFromPlayers([
    player('female', {gender: 'Female'}),
    player('male', {gender: 'Male'}),
    player('unknown', {gender: 'Unknown', clashIndex: 875}),
  ]);

  assert.ok(result);
  assert.equal(result.femalePlayerCount, 1);
  assert.equal(result.malePlayerCount, 1);
  assert.equal(result.unknownGenderPlayerCount, 1);
  assert.equal(
    result.femalePlayerCount + result.malePlayerCount + result.unknownGenderPlayerCount,
    result.rosterPlayerCount,
  );
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
  assert.equal(result.baseStrength, 850);
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
  assert.equal(result.baseStrength, 912);
  assert.equal(result.provisionalPlayerCount, 1);
  assert.equal(result.fallbackPlayerCount, 1);
});

test('confirmed available strength includes only explicit Playing responses and captures composition', () => {
  const players = [
    player('playing-female', {gender: 'Female'}),
    player('playing-male'),
    player('unconfirmed', {gender: 'Female'}),
    player('not-playing'),
  ];
  const result = calculateConfirmedAvailableRosterStrength(players, [
    {playerId: 'playing-female', playerName: 'Playing F', teamId: 'team', status: 'Playing'},
    {playerId: 'playing-male', playerName: 'Playing M', teamId: 'team', status: 'Playing'},
    {playerId: 'unconfirmed', playerName: 'Unconfirmed', teamId: 'team', status: 'Unconfirmed'},
    {playerId: 'not-playing', playerName: 'Not Playing', teamId: 'team', status: 'NotPlaying'},
  ]);

  assert.ok(result);
  assert.equal(result.source, 'confirmedAvailableRoster');
  assert.equal(result.label, 'Confirmed Available Roster Strength');
  assert.equal(result.baseStrength, 900);
  assert.equal(result.rosterPlayerCount, 2);
  assert.equal(result.femalePlayerCount, 1);
  assert.equal(result.malePlayerCount, 1);
  assert.equal(result.standardPlayerShortfall, 16);
  assert.deepEqual(result.playerIds.sort(), ['playing-female', 'playing-male']);
  assert.equal('activeRosterStrength' in result, false);
});

test('official lineup strength resolves immutable player ids and exposes missing composition data', () => {
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

  const result = calculateMatchLineupStrength([player('known', {gender: 'Female'})], roster);
  assert.ok(result);
  assert.equal(result.source, 'matchLineup');
  assert.equal(result.baseStrength, 900);
  assert.equal(result.rosterPlayerCount, 2);
  assert.equal(result.playerCount, 1);
  assert.equal(result.omittedPlayerCount, 1);
  assert.equal(result.femalePlayerCount, 1);
  assert.equal(result.malePlayerCount, 0);
  assert.equal(result.unknownGenderPlayerCount, 1);
  assert.equal(result.standardPlayerShortfall, 16);
  assert.equal(result.confidence, 'Low');
  assert.equal('activeRosterStrength' in result, false);
});

test('shortfall is diagnostic only and reaches zero at eighteen selected players', () => {
  const players = Array.from({length: 18}, (_, index) =>
    player(`p-${index}`, {clashIndex: 900 + index}),
  );
  const full = calculateActiveRosterStrengthFromPlayers(players);
  assert.ok(full);
  assert.equal(full.rosterPlayerCount, 18);
  assert.equal(full.standardPlayerShortfall, 0);

  const oversized = calculateActiveRosterStrengthFromPlayers([
    ...players,
    player('p-18'),
  ]);
  assert.ok(oversized);
  assert.equal(oversized.standardPlayerShortfall, 0);
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
