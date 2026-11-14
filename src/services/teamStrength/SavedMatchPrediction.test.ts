import assert from 'node:assert/strict';
import test from 'node:test';
import {savedPrediction} from './SavedMatchPrediction';
const row = {captured_at: '2026-11-13T20:00:00Z', team_id: 'home', opponent_team_id: 'away', side: 'Home', source: 'matchLineup', chance_of_victory: .613, prediction_readiness: 'Ready', confidence: 'Full', strength_label: 'Lineup', team_base_strength: 900, opponent_base_strength: 895};
test('retains the actual saved probability; rejects captures on or after matchday and reversed teams', () => {
  const saved = savedPrediction(row, '2026-11-14', 'home', 'away');
  assert.ok(saved?.state === 'calculated');
  assert.equal(saved.homeChanceOfVictory, .613);
  assert.equal(saved.homeProjectedMargin, null);
  for (const captured_at of ['2026-11-14T05:00:00Z', '2026-11-16T12:00:00Z', 'bad']) assert.equal(savedPrediction({...row, captured_at}, '2026-11-14', 'home', 'away'), undefined);
  assert.equal(savedPrediction(row, '2026-11-14', 'away', 'home'), undefined);
});
test('unavailable saved inputs never acquire a public percentage', () => {
  const saved = savedPrediction({...row, prediction_readiness: 'Unavailable'}, '2026-11-14', 'home', 'away');
  assert.ok(saved?.state === 'calculated');
  assert.equal(saved.homeChanceOfVictory, null);
});

test('reconstructs only frozen prematch point shares, using capture-era spread calibration', () => {
  const v3 = savedPrediction({...row, model_version: 'ci-model-estimates-v3', expected_point_share: .55}, '2026-11-14', 'home', 'away');
  const old = savedPrediction({...row, model_version: 'ci-model-estimates-v2', expected_point_share: .55}, '2026-11-14', 'home', 'away');
  assert.ok(v3?.state === 'calculated' && old?.state === 'calculated');
  assert.ok(Math.abs((v3.homeProjectedMargin ?? 0) - 3.24) < 1e-10);
  assert.ok(Math.abs((old.homeProjectedMargin ?? 0) - 3.6) < 1e-10);
  const unavailable = savedPrediction({...row, model_version: 'ci-model-estimates-v3', expected_point_share: .55, prediction_readiness: 'Unavailable'}, '2026-11-14', 'home', 'away');
  assert.ok(unavailable?.state === 'calculated');
  assert.equal(unavailable.homeProjectedMargin, null);
});
