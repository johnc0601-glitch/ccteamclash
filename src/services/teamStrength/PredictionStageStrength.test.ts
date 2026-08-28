import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';
import {calculateMatchStageStrengthPair} from './PredictionStageStrength';

test('active roster stage uses all active players from each supplied season roster', () => {
  const pair = calculateMatchStageStrengthPair({
    source: 'activeRoster',
    homeTeamId: 'home',
    awayTeamId: 'away',
    homePlayers: [player('h1', 900), player('h2', 800, false)],
    awayPlayers: [player('a1', 880)],
  });

  assert.ok(pair);
  assert.equal(pair.home.rosterPlayerCount, 1);
  assert.deepEqual(pair.home.playerIds, ['h1']);
  assert.equal(pair.away.baseStrength, 880);
});

test('confirmed available stage includes only Playing attendance records', () => {
  const pair = calculateMatchStageStrengthPair({
    source: 'confirmedAvailableRoster',
    homeTeamId: 'home',
    awayTeamId: 'away',
    homePlayers: [player('h1', 900), player('h2', 850)],
    awayPlayers: [player('a1', 880), player('a2', 860)],
    homeAttendance: [
      {playerId: 'h1', playerName: 'h1', teamId: 'home', status: 'Playing'},
      {playerId: 'h2', playerName: 'h2', teamId: 'home', status: 'Unconfirmed'},
    ],
    awayAttendance: [
      {playerId: 'a1', playerName: 'a1', teamId: 'away', status: 'Playing'},
      {playerId: 'a2', playerName: 'a2', teamId: 'away', status: 'NotPlaying'},
    ],
  });

  assert.ok(pair);
  assert.deepEqual(pair.home.playerIds, ['h1']);
  assert.deepEqual(pair.away.playerIds, ['a1']);
  assert.equal(pair.home.source, 'confirmedAvailableRoster');
});

test('match lineup stage requires official snapshots for both teams', () => {
  const homePlayers = [player('h1', 900)];
  const awayPlayers = [player('a1', 880)];
  const complete = calculateMatchStageStrengthPair({
    source: 'matchLineup',
    homeTeamId: 'home',
    awayTeamId: 'away',
    homePlayers,
    awayPlayers,
    officialRosters: [officialRoster('home', 'h1'), officialRoster('away', 'a1')],
  });
  const incomplete = calculateMatchStageStrengthPair({
    source: 'matchLineup',
    homeTeamId: 'home',
    awayTeamId: 'away',
    homePlayers,
    awayPlayers,
    officialRosters: [officialRoster('home', 'h1')],
  });

  assert.ok(complete);
  assert.equal(complete.home.baseStrength, 900);
  assert.equal(complete.away.baseStrength, 880);
  assert.equal(incomplete, undefined);
});

function player(id: string, clashIndex: number, active = true): LaunchPlayer {
  return {
    id,
    name: id,
    gender: 'Male',
    pdgaNumber: '',
    pdgaRating: null,
    clashIndex,
    clashIndexProvisional: false,
    currentTeamId: 'team',
    homeArea: '',
    active,
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
  };
}

function officialRoster(teamId: string, playerId: string): OfficialMatchRoster {
  return {
    id: `roster-${teamId}`,
    matchId: 'match',
    teamId,
    teamNameSnapshot: teamId,
    needsCommissionerReview: false,
    createdAt: '2026-10-03T19:00:00.000Z',
    updatedBy: null,
    updatedAt: '2026-10-03T19:00:00.000Z',
    players: [{
      id: `snapshot-${playerId}`,
      matchId: 'match',
      teamId,
      teamNameSnapshot: teamId,
      playerId,
      playerNameSnapshot: playerId,
      createdAt: '2026-10-03T19:00:00.000Z',
      updatedBy: null,
      updatedAt: '2026-10-03T19:00:00.000Z',
    }],
  };
}
