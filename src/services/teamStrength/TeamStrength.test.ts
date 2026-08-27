import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateRosterStrength,
  DOUBLES_HOME_CI_BONUS,
  effectiveDoublesCi,
  expectedTeamPointShare,
  homeCiBonusForFormat,
  SINGLES_HOME_CI_BONUS,
  TEAM_HOME_CI_BONUS,
} from './TeamStrength';

test('weights top six, next six, and depth at 35/35/30', () => {
  const ratings = [
    1000, 990, 980, 970, 960, 950,
    940, 930, 920, 910, 900, 890,
    880, 870, 860, 850, 840, 830,
  ];

  const result = calculateRosterStrength(ratings);
  assert.ok(result);
  assert.equal(result.topSixCi, 975);
  assert.equal(result.nextSixCi, 915);
  assert.equal(result.depthCi, 855);
  assert.equal(result.neutralStrength, 918);
  assert.equal(result.homeStrength, 918 + TEAM_HOME_CI_BONUS);
  assert.equal(result.confidence, 'Full');
});

test('marks incomplete rosters as low confidence instead of treating them as complete', () => {
  const result = calculateRosterStrength([950, 940, 930, 920, 910, 900, 890, 880, 870, 860, 850]);
  assert.ok(result);
  assert.equal(result.playerCount, 11);
  assert.equal(result.confidence, 'Low');
});

test('uses the locked 80/20 doubles strength rule', () => {
  assert.equal(effectiveDoublesCi(1000, 800), 960);
  assert.equal(effectiveDoublesCi(800, 1000), 960);
});

test('uses calibrated format-level home bonuses', () => {
  assert.equal(homeCiBonusForFormat('Singles'), SINGLES_HOME_CI_BONUS);
  assert.equal(homeCiBonusForFormat('Doubles'), DOUBLES_HOME_CI_BONUS);
  assert.equal(SINGLES_HOME_CI_BONUS, 15);
  assert.equal(DOUBLES_HOME_CI_BONUS, 8);
});

test('equal neutral teams have a 50 percent expected point share', () => {
  assert.equal(expectedTeamPointShare(900, 900), 0.5);
  assert.ok(expectedTeamPointShare(900, 900, 'Home') > 0.5);
  assert.ok(expectedTeamPointShare(900, 900, 'Away') < 0.5);
});
