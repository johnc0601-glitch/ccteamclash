import assert from 'node:assert/strict';
import test from 'node:test';
import {analyzeFrozenTeamMatch, type FrozenTeamContestFact} from './FrozenTeamMatchAnalysis';
import {effectiveDoublesCi, expectedContestPointShare} from './TeamStrength';

const singles: FrozenTeamContestFact[] = [
  {contest_id: 's1', player_id: 'home', side: 'Home', format: 'Singles', clash_index_before: 890, actual_points: 1},
  {contest_id: 's1', player_id: 'away', side: 'Away', format: 'Singles', clash_index_before: 900, actual_points: 0},
];

test('automatic points can turn a rated underdog into the team favorite', () => {
  const withoutAutomatic = analyzeFrozenTeamMatch({facts: singles, venue: 'Home', homeScore: 1, awayScore: 0});
  const withAutomatic = analyzeFrozenTeamMatch({facts: singles, venue: 'Home', homeScore: 2, awayScore: 0});
  assert.ok(withoutAutomatic && withAutomatic);
  assert.ok(withoutAutomatic.homeChanceOfVictory < 0.5);
  assert.ok(withAutomatic.homeChanceOfVictory > 0.5);
  assert.equal(withAutomatic.homeStructuralAdjustment, 1);
  assert.equal(withAutomatic.homeExpectedPoints, withoutAutomatic.homeExpectedPoints + 1);
  assert.equal(withAutomatic.awayExpectedPoints, withoutAutomatic.awayExpectedPoints);
});

test('uses the team +8 home adjustment rather than the singles CI +15', () => {
  const result = analyzeFrozenTeamMatch({facts: singles, venue: 'Home', homeScore: 1, awayScore: 0});
  assert.ok(result);
  // With +15 this home side would incorrectly become the favorite.
  assert.ok(result.homeChanceOfVictory < 0.5);
  assert.equal(result.homeExpectedPoints, expectedContestPointShare(890, 900, 'Home'));
  const neutral = analyzeFrozenTeamMatch({facts: singles, venue: 'Neutral', homeScore: 1, awayScore: 0});
  assert.ok(neutral && neutral.homeChanceOfVictory < result.homeChanceOfVictory);
});

test('counts a doubles pair once, with 80/20 strength and two team points', () => {
  const facts: FrozenTeamContestFact[] = [
    {contest_id: 'd1', player_id: 'h1', side: 'Home', format: 'Doubles', clash_index_before: 1000, actual_points: 1},
    {contest_id: 'd1', player_id: 'h2', side: 'Home', format: 'Doubles', clash_index_before: 800, actual_points: 1},
    {contest_id: 'd1', player_id: 'a1', side: 'Away', format: 'Doubles', clash_index_before: 950, actual_points: 0},
    {contest_id: 'd1', player_id: 'a2', side: 'Away', format: 'Doubles', clash_index_before: 950, actual_points: 0},
  ];
  const result = analyzeFrozenTeamMatch({facts, venue: 'Home', homeScore: 2, awayScore: 0});
  assert.ok(result);
  assert.equal(result.homeStructuralAdjustment, 0);
  assert.equal(result.awayStructuralAdjustment, 0);
  assert.equal(result.homeExpectedPoints, 2 * expectedContestPointShare(effectiveDoublesCi(1000, 800), 950, 'Home'));
  assert.equal(result.homeExpectedPoints + result.awayExpectedPoints, 2);
});

test('retains half-point penalties and adjustments on either side', () => {
  const result = analyzeFrozenTeamMatch({facts: singles, venue: 'Home', homeScore: 2.5, awayScore: 0.5});
  assert.ok(result);
  assert.equal(result.homeStructuralAdjustment, 1.5);
  assert.equal(result.awayStructuralAdjustment, 0.5);
  assert.equal(result.homeExpectedPoints + result.awayExpectedPoints, 3);
});

test('ties contribute half a point without creating artificial structural points', () => {
  const facts = singles.map((fact) => ({...fact, actual_points: '0.5'}));
  const result = analyzeFrozenTeamMatch({facts, venue: 'Home', homeScore: 0.5, awayScore: 0.5});
  assert.ok(result);
  assert.equal(result.homeStructuralAdjustment, 0);
  assert.equal(result.awayStructuralAdjustment, 0);
});

test('does not generate team odds from absent scores or partial/conflicting frozen facts', () => {
  const input = {facts: singles, venue: 'Home' as const, homeScore: 1, awayScore: 0};
  assert.equal(analyzeFrozenTeamMatch({...input, homeScore: null}), undefined);
  assert.equal(analyzeFrozenTeamMatch({...input, awayScore: Number.NaN}), undefined);
  assert.equal(analyzeFrozenTeamMatch({...input, facts: []}), undefined);
  assert.equal(analyzeFrozenTeamMatch({...input, facts: singles.slice(0, 1)}), undefined);
  assert.equal(analyzeFrozenTeamMatch({...input, facts: [...singles, singles[0]]}), undefined);
  assert.equal(analyzeFrozenTeamMatch({...input, facts: singles.map((row) => ({...row, actual_points: 1}))}), undefined);
});
