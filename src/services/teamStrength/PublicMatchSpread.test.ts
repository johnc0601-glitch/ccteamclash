import assert from 'node:assert/strict';
import test from 'node:test';
import {toPublicMatchSpread} from './PublicMatchSpread';
import type {PublicMatchPrediction} from './PublicMatchPrediction';

const forecast: PublicMatchPrediction = {
  state: 'calculated', source: 'activeRoster', stageLabel: 'Active Roster Strength',
  strengthLabel: 'Active Roster Strength', displayLabel: 'Early estimate',
  readiness: 'EarlyEstimate', confidence: 'Full',
  awayStrength: 880, homeStrength: 920,
  homeChanceOfVictory: .85, awayChanceOfVictory: .15,
  homeProjectedMargin: 4.37,
  venueNote: '', updateNote: '',
};

test('publishes only favored-by spread, without private probabilities or CI strengths', () => {
  const spread = toPublicMatchSpread(forecast, 'Home Team', 'Away Team');
  assert.deepEqual(spread, {
    favoriteTeam: 'Home Team',
    points: 4.5,
    closeness: 'Within two doubles-result swings (8 pts)',
    isEarlyEstimate: true,
  });
  assert.equal(Object.keys(spread ?? {}).some(key => /chance|probab|strength|rating|clashIndex/i.test(key)), false);
  assert.equal(JSON.stringify(spread).includes('0.85'), false);
});

test('away favorites, pick em, and unavailable predictions use public-only fields', () => {
  assert.deepEqual(toPublicMatchSpread({...forecast, readiness: 'Ready', homeProjectedMargin: -2}, 'Home', 'Away'), {
    favoriteTeam: 'Away', points: 2, closeness: 'Within one doubles-result swing (4 pts)', isEarlyEstimate: false,
  });
  assert.deepEqual(toPublicMatchSpread({...forecast, homeProjectedMargin: .1}, 'Home', 'Away'), {
    favoriteTeam: null, points: 0, closeness: 'Even on projected points', isEarlyEstimate: true,
  });
  assert.equal(toPublicMatchSpread({...forecast, homeProjectedMargin: null}, 'Home', 'Away'), undefined);
  assert.equal(toPublicMatchSpread(undefined, 'Home', 'Away'), undefined);
  assert.equal(toPublicMatchSpread({state: 'waiting', source: 'matchLineup', stageLabel: '', displayLabel: 'Prediction updating', detail: '', updateNote: ''}, 'Home', 'Away'), undefined);
});
