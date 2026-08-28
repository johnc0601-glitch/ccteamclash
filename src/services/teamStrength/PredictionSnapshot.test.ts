import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';

import {calculateRosterBasedMatchPrediction} from './MatchPrediction';
import {
  buildTeamStrengthPredictionSnapshot,
  TEAM_STRENGTH_CAPTURE_REASONS,
} from './PredictionSnapshot';
import {calculateRosterStageStrength, type TeamStrengthSource} from './RosterStrength';

test('derives fixed capture reasons from the strength source', () => {
  assert.equal(TEAM_STRENGTH_CAPTURE_REASONS.activeRoster, 'PreMatch');
  assert.equal(TEAM_STRENGTH_CAPTURE_REASONS.confirmedAvailableRoster, 'AttendanceFinal');
  assert.equal(TEAM_STRENGTH_CAPTURE_REASONS.matchLineup, 'RosterLock');
});

test('freezes exact player pool, CI, composition, shortfall, calibration and data quality', () => {
  const team = strength('activeRoster', [
    player('b', 910, false, 'Female'),
    player('a', 900, true, 'Male'),
  ]);
  const opponent = strength('activeRoster', [
    player('d', 900, false, 'Male'),
    player('c', 890, false, 'Unknown'),
  ]);
  assert.ok(team && opponent);

  const prediction = calculateRosterBasedMatchPrediction({
    team,
    opponent,
    venue: 'Home',
  });
  assert.ok(prediction);

  const snapshot = buildTeamStrengthPredictionSnapshot({
    matchId: 'match-1',
    teamId: 'home-team',
    opponentTeamId: 'away-team',
    side: 'Home',
    prediction,
    teamStrength: team,
    opponentStrength: opponent,
    capturedAt: '2026-10-01T12:00:00.000Z',
  });

  assert.ok(snapshot);
  assert.equal(snapshot.captureReason, 'PreMatch');
  assert.equal(snapshot.source, 'activeRoster');
  assert.equal(snapshot.strengthLabel, 'Active Roster Strength');
  assert.equal(snapshot.predictionReadiness, 'EarlyEstimate');
  assert.deepEqual(snapshot.teamPlayerIds, ['a', 'b']);
  assert.deepEqual(snapshot.opponentPlayerIds, ['c', 'd']);
  assert.deepEqual(snapshot.teamPlayerClashIndexes, [
    {playerId: 'a', clashIndex: 900},
    {playerId: 'b', clashIndex: 910},
  ]);
  assert.deepEqual(snapshot.opponentPlayerClashIndexes, [
    {playerId: 'c', clashIndex: 890},
    {playerId: 'd', clashIndex: 900},
  ]);
  assert.equal(snapshot.teamFemalePlayerCount, 1);
  assert.equal(snapshot.teamMalePlayerCount, 1);
  assert.equal(snapshot.teamUnknownGenderPlayerCount, 0);
  assert.equal(snapshot.opponentFemalePlayerCount, 0);
  assert.equal(snapshot.opponentMalePlayerCount, 1);
  assert.equal(snapshot.opponentUnknownGenderPlayerCount, 1);
  assert.equal(snapshot.teamStandardPlayerShortfall, 16);
  assert.equal(snapshot.opponentStandardPlayerShortfall, 16);
  assert.equal(snapshot.teamProvisionalPlayerCount, 1);
  assert.equal(snapshot.opponentProvisionalPlayerCount, 0);
  assert.equal(snapshot.capturedAt, '2026-10-01T12:00:00.000Z');

  team.playerClashIndexes[0].clashIndex = 123;
  assert.deepEqual(snapshot.teamPlayerClashIndexes, [
    {playerId: 'a', clashIndex: 900},
    {playerId: 'b', clashIndex: 910},
  ]);
});

test('rejects a snapshot when prediction and roster sources differ', () => {
  const activeTeam = strength('activeRoster', [player('a', 900, false)]);
  const activeOpponent = strength('activeRoster', [player('b', 900, false)]);
  const lineupTeam = strength('matchLineup', [player('a', 900, false)]);
  assert.ok(activeTeam && activeOpponent && lineupTeam);

  const prediction = calculateRosterBasedMatchPrediction({
    team: activeTeam,
    opponent: activeOpponent,
  });
  assert.ok(prediction);

  assert.equal(
    buildTeamStrengthPredictionSnapshot({
      matchId: 'match-1',
      teamId: 'team',
      opponentTeamId: 'opponent',
      side: 'Home',
      prediction,
      teamStrength: lineupTeam,
      opponentStrength: activeOpponent,
    }),
    undefined,
  );
});

test('rejects invalid capture timestamps and invalid identities', () => {
  const team = strength('matchLineup', [player('a', 900, false)]);
  const opponent = strength('matchLineup', [player('b', 900, false)]);
  assert.ok(team && opponent);
  const prediction = calculateRosterBasedMatchPrediction({team, opponent});
  assert.ok(prediction);

  assert.equal(
    buildTeamStrengthPredictionSnapshot({
      matchId: 'match',
      teamId: 'team',
      opponentTeamId: 'opponent',
      side: 'Home',
      prediction,
      teamStrength: team,
      opponentStrength: opponent,
      capturedAt: 'not-a-date',
    }),
    undefined,
  );

  assert.equal(
    buildTeamStrengthPredictionSnapshot({
      matchId: 'match',
      teamId: 'same',
      opponentTeamId: 'same',
      side: 'Home',
      prediction,
      teamStrength: team,
      opponentStrength: opponent,
    }),
    undefined,
  );
});

function strength(source: TeamStrengthSource, players: LaunchPlayer[]) {
  return calculateRosterStageStrength(source, players, players.map((candidate) => candidate.id));
}

function player(
  id: string,
  clashIndex: number,
  provisional: boolean,
  gender: LaunchPlayer['gender'] = 'Male',
): LaunchPlayer {
  return {
    id,
    name: id,
    gender,
    pdgaNumber: '',
    pdgaRating: null,
    clashIndex,
    clashIndexProvisional: provisional,
    currentTeamId: 'team',
    homeArea: '',
    active: true,
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
  };
}
