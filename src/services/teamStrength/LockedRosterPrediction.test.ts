import assert from 'node:assert/strict';
import test from 'node:test';
import {calculateLockedRosterPrediction} from './LockedRosterPrediction';

const input = {
  homeTeamId: 'home', awayTeamId: 'away', venue: 'Home' as const,
  rosterPlayers: [{team_id: 'home', player_id: 'h'}, {team_id: 'away', player_id: 'a'}],
  frozenRatings: [
    {team_id: 'home', player_id: 'h', clash_index_before: 890},
    {team_id: 'away', player_id: 'a', clash_index_before: 900},
  ],
};

test('uses the locked roster stage curve and applies +8 home advantage once', () => {
  const result = calculateLockedRosterPrediction(input);
  assert.ok(result);
  assert.equal(result.homeChanceOfVictory, 1 / (1 + Math.exp(-0.117 * -2)));
  assert.ok(result.homeChanceOfVictory < 0.5);
});

test('penalties and changed match scores cannot change the roster-lock odds', () => {
  const beforeInput = {...input, homeScore: 13, awayScore: 12, penaltyPoints: 0};
  const afterInput = {...input, homeScore: 13, awayScore: 30, penaltyPoints: 18};
  const before = calculateLockedRosterPrediction(beforeInput);
  const after = calculateLockedRosterPrediction(afterInput);
  assert.deepEqual(before, after);
});

test('result-only participants do not change the locked player pool', () => {
  const result = calculateLockedRosterPrediction({...input, frozenRatings: [
    ...input.frozenRatings, {team_id: 'home', player_id: 'substitute', clash_index_before: 1100},
    input.frozenRatings[0],
  ]});
  assert.deepEqual(result, calculateLockedRosterPrediction(input));
});

test('requires frozen CI for every locked player instead of using the result lineup', () => {
  assert.equal(calculateLockedRosterPrediction({...input, rosterPlayers: [
    ...input.rosterPlayers, {team_id: 'home', player_id: 'absent'},
  ]}), undefined);
  assert.equal(calculateLockedRosterPrediction({...input, frozenRatings: [
    ...input.frozenRatings, {...input.frozenRatings[0], clash_index_before: 999},
  ]}), undefined);
  assert.equal(calculateLockedRosterPrediction({...input, rosterPlayers: []}), undefined);
});

test('uses roster depth weights, rather than actual singles or doubles pairings', () => {
  const rosterPlayers = Array.from({length: 18}, (_, i) => ({team_id: 'home', player_id: `h${i}`}));
  const frozenRatings = rosterPlayers.map((row, i) => ({...row, clash_index_before: i < 6 ? 1000 : i < 12 ? 900 : 800}));
  const result = calculateLockedRosterPrediction({...input,
    rosterPlayers: [...rosterPlayers, input.rosterPlayers[1]],
    frozenRatings: [...frozenRatings, input.frozenRatings[1]],
  });
  assert.ok(result);
  assert.equal(result.homeStrength, 905);
  assert.equal(result.awayStrength, 900);
});
