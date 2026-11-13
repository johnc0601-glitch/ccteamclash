import assert from 'node:assert/strict';
import test from 'node:test';
import {savedPrediction} from './SavedMatchPrediction';
const row = {captured_at: '2026-11-13T20:00:00Z', team_id: 'home', opponent_team_id: 'away', side: 'Home', source: 'matchLineup', chance_of_victory: .613, prediction_readiness: 'Ready', confidence: 'Full', strength_label: 'Lineup', team_base_strength: 900, opponent_base_strength: 895};
test('retains the actual saved probability; rejects captures on or after matchday and reversed teams', () => {
  const saved = savedPrediction(row, '2026-11-14', 'home', 'away');
  assert.ok(saved?.state === 'calculated');
  assert.equal(saved.homeChanceOfVictory, .613);
  for (const captured_at of ['2026-11-14T05:00:00Z', '2026-11-16T12:00:00Z', 'bad']) assert.equal(savedPrediction({...row, captured_at}, '2026-11-14', 'home', 'away'), undefined);
  assert.equal(savedPrediction(row, '2026-11-14', 'away', 'home'), undefined);
});
test('unavailable saved inputs never acquire a public percentage', () => {
  const saved = savedPrediction({...row, prediction_readiness: 'Unavailable'}, '2026-11-14', 'home', 'away');
  assert.ok(saved?.state === 'calculated');
  assert.equal(saved.homeChanceOfVictory, null);
});
