import assert from 'node:assert/strict';
import test from 'node:test';

import type {TeamStrengthPredictionSnapshot} from './PredictionSnapshot';
import {
  fromPredictionSnapshotRow,
  SupabasePredictionSnapshotRepository,
  toPredictionSnapshotInsert,
} from './PredictionSnapshotRepository';

function makeSnapshot(): TeamStrengthPredictionSnapshot {
  return {
    matchId: 'match',
    teamId: 'home',
    opponentTeamId: 'away',
    side: 'Home',
    source: 'matchLineup',
    captureReason: 'RosterLock',
    strengthLabel: 'Match Lineup Strength',
    modelVersion: 'team-strength-v1',
    capturedAt: '2026-10-03T16:00:00.000Z',
    venue: 'Home',
    confidence: 'Partial',
    predictionReadiness: 'EarlyEstimate',
    calibrationSlope: 0.117,
    teamBaseStrength: 900,
    opponentBaseStrength: 890,
    matchupStrengthDifference: 18,
    expectedPointShare: 0.59,
    chanceOfVictory: 0.89,
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
}

test('maps the immutable prediction snapshot to the database row without relabeling fields', () => {
  const snapshot = makeSnapshot();
  const row = toPredictionSnapshotInsert(snapshot);

  assert.equal(row.match_id, 'match');
  assert.equal(row.source, 'matchLineup');
  assert.equal(row.capture_reason, 'RosterLock');
  assert.equal(row.strength_label, 'Match Lineup Strength');
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

test('round-trips persisted frozen CI without replacing unresolved null values', () => {
  const snapshot = makeSnapshot();
  const row = toPredictionSnapshotInsert(snapshot);
  const restored = fromPredictionSnapshotRow(row);

  assert.deepEqual(restored, snapshot);
  assert.equal(restored.opponentPlayerClashIndexes[1].clashIndex, null);
  assert.notEqual(restored.teamPlayerIds, snapshot.teamPlayerIds);
  assert.notEqual(restored.teamPlayerClashIndexes, snapshot.teamPlayerClashIndexes);
});

test('loads the frozen Home snapshot for the requested stage and model version', async () => {
  const snapshot = makeSnapshot();
  const row = toPredictionSnapshotInsert(snapshot);
  const calls: unknown[][] = [];

  const query = {
    select(columns: string) {
      calls.push(['select', columns]);
      return this;
    },
    eq(column: string, value: string) {
      calls.push(['eq', column, value]);
      return this;
    },
    async maybeSingle() {
      calls.push(['maybeSingle']);
      return {data: row, error: null};
    },
  };
  const supabase = {
    from(table: string) {
      calls.push(['from', table]);
      return query;
    },
  };

  const repository = new SupabasePredictionSnapshotRepository(supabase as any);
  const restored = await repository.findHomeSnapshot(' match ', 'matchLineup', ' team-strength-v1 ');

  assert.deepEqual(restored, snapshot);
  assert.deepEqual(calls, [
    ['from', 'team_strength_prediction_snapshots'],
    ['select', '*'],
    ['eq', 'match_id', 'match'],
    ['eq', 'side', 'Home'],
    ['eq', 'source', 'matchLineup'],
    ['eq', 'model_version', 'team-strength-v1'],
    ['maybeSingle'],
  ]);
});

test('retrospective Match Lineup reader stays model-version isolated', async () => {
  const calls: unknown[][] = [];
  const query = {
    select(columns: string) {
      calls.push(['select', columns]);
      return this;
    },
    eq(column: string, value: string) {
      calls.push(['eq', column, value]);
      return this;
    },
    async maybeSingle() {
      calls.push(['maybeSingle']);
      return {data: null, error: null};
    },
  };
  const supabase = {
    from(table: string) {
      calls.push(['from', table]);
      return query;
    },
  };

  const repository = new SupabasePredictionSnapshotRepository(supabase as any);
  assert.equal(
    await repository.findHomeMatchLineupSnapshot('match', 'team-strength-v2'),
    undefined,
  );
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'model_version' && call[2] === 'team-strength-v2'));
});

test('does not query persistence for an empty retrospective match id', async () => {
  const supabase = {
    from() {
      throw new Error('database should not be queried');
    },
  };
  const repository = new SupabasePredictionSnapshotRepository(supabase as any);

  assert.equal(await repository.findHomeMatchLineupSnapshot('   '), undefined);
});
