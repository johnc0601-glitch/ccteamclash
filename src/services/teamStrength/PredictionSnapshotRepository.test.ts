import assert from 'node:assert/strict';
import test from 'node:test';

import type {TeamStrengthPredictionSnapshot} from './PredictionSnapshot';
import {toPredictionSnapshotInsert} from './PredictionSnapshotRepository';

test('maps the immutable prediction snapshot to the database row without relabeling fields', () => {
  const snapshot: TeamStrengthPredictionSnapshot = {
    matchId: 'match',
    teamId: 'home',
    opponentTeamId: 'away',
    side: 'Home',
    source: 'confirmedAvailableRoster',
    captureReason: 'AttendanceFinal',
    strengthLabel: 'Confirmed Available Roster Strength',
    modelVersion: 'team-strength-v1',
    capturedAt: '2026-10-02T16:00:00.000Z',
    venue: 'Home',
    confidence: 'Partial',
    predictionReadiness: 'EarlyEstimate',
    calibrationSlope: 0.088,
    teamBaseStrength: 900,
    opponentBaseStrength: 890,
    matchupStrengthDifference: 18,
    expectedPointShare: 0.59,
    chanceOfVictory: 0.83,
    teamPlayerIds: ['a', 'b'],
    opponentPlayerIds: ['c', 'd'],
    teamPlayerClashIndexes: [
      {playerId: 'a', clashIndex: 900},
      {playerId: 'b', clashIndex: 825},
    ],
    opponentPlayerClashIndexes: [
      {playerId: 'c', clashIndex: 890},
      {playerId: 'd', clashIndex: null},
    ],
    teamPlayerCount: 2,
    opponentPlayerCount: 2,
    teamFemalePlayerCount: 1,
    opponentFemalePlayerCount: 0,
    teamMalePlayerCount: 1,
    opponentMalePlayerCount: 1,
    teamUnknownGenderPlayerCount: 0,
    opponentUnknownGenderPlayerCount: 1,
    teamStandardPlayerShortfall: 16,
    opponentStandardPlayerShortfall: 16,
    teamProvisionalPlayerCount: 1,
    opponentProvisionalPlayerCount: 0,
    teamFallbackPlayerCount: 1,
    opponentFallbackPlayerCount: 0,
    teamOmittedPlayerCount: 0,
    opponentOmittedPlayerCount: 0,
  };

  const row = toPredictionSnapshotInsert(snapshot);

  assert.equal(row.match_id, 'match');
  assert.equal(row.source, 'confirmedAvailableRoster');
  assert.equal(row.capture_reason, 'AttendanceFinal');
  assert.equal(row.strength_label, 'Confirmed Available Roster Strength');
  assert.equal(row.prediction_readiness, 'EarlyEstimate');
  assert.equal(row.team_base_strength, 900);
  assert.equal(row.opponent_base_strength, 890);
  assert.equal(row.matchup_strength_difference, 18);
  assert.deepEqual(row.team_player_ids, ['a', 'b']);
  assert.deepEqual(row.opponent_player_ids, ['c', 'd']);
  assert.deepEqual(row.team_player_clash_indexes, [
    {playerId: 'a', clashIndex: 900},
    {playerId: 'b', clashIndex: 825},
  ]);
  assert.deepEqual(row.opponent_player_clash_indexes, [
    {playerId: 'c', clashIndex: 890},
    {playerId: 'd', clashIndex: null},
  ]);
  assert.equal(row.team_female_player_count, 1);
  assert.equal(row.opponent_female_player_count, 0);
  assert.equal(row.team_male_player_count, 1);
  assert.equal(row.opponent_male_player_count, 1);
  assert.equal(row.opponent_unknown_gender_player_count, 1);
  assert.equal(row.team_standard_player_shortfall, 16);
  assert.equal(row.opponent_standard_player_shortfall, 16);
});
