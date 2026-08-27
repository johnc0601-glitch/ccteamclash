import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateActiveRosterStrength,
  calculateExpectedMatchPoints,
  DOUBLES_HOME_CI_BONUS,
  effectiveDoublesCi,
  expectedContestPointShare,
  expectedDoublesPointShareFromPool,
  expectedTeamPointShare,
  homeCiBonusForFormat,
  SINGLES_HOME_CI_BONUS,
  TEAM_HOME_CI_BONUS,
  TEAM_STRENGTH_LABELS,
} from './TeamStrength';

test('labels roster-derived strength explicitly by information stage', () => {
  assert.equal(TEAM_STRENGTH_LABELS.activeRoster, 'Active Roster Strength');
  assert.equal(TEAM_STRENGTH_LABELS.availableRoster, 'Available Roster Strength');
  assert.equal(TEAM_STRENGTH_LABELS.matchLineup, 'Match Lineup Strength');
});

test('weights top six, next six, and depth at 35/35/30 and keeps the result venue-neutral', () => {
  const ratings = [
    1000, 990, 980, 970, 960, 950,
    940, 930, 920, 910, 900, 890,
    880, 870, 860, 850, 840, 830,
  ];

  const result = calculateActiveRosterStrength(ratings);
  assert.ok(result);
  assert.equal(result.topSixCi, 975);
  assert.equal(result.nextSixCi, 915);
  assert.equal(result.depthCi, 855);
  assert.equal(result.activeRosterStrength, 918);
  assert.equal(result.confidence, 'Full');
});

test('marks incomplete active rosters as low confidence instead of treating them as complete', () => {
  const result = calculateActiveRosterStrength([950, 940, 930, 920, 910, 900, 890, 880, 870, 860, 850]);
  assert.ok(result);
  assert.equal(result.playerCount, 11);
  assert.equal(result.confidence, 'Low');
});

test('uses the locked 80/20 doubles strength rule', () => {
  assert.equal(effectiveDoublesCi(1000, 800), 960);
  assert.equal(effectiveDoublesCi(800, 1000), 960);
});

test('keeps format-level CI home bonuses available without using them as roster strength', () => {
  assert.equal(homeCiBonusForFormat('Singles'), SINGLES_HOME_CI_BONUS);
  assert.equal(homeCiBonusForFormat('Doubles'), DOUBLES_HOME_CI_BONUS);
  assert.equal(SINGLES_HOME_CI_BONUS, 15);
  assert.equal(DOUBLES_HOME_CI_BONUS, 8);
});

test('applies the league-wide +8 home effect exactly once in matchup prediction', () => {
  const expectedHomeShare = 1 / (1 + Math.pow(10, -TEAM_HOME_CI_BONUS / 105));
  assert.equal(expectedTeamPointShare(900, 900), 0.5);
  assert.ok(Math.abs(expectedTeamPointShare(900, 900, 'Home') - expectedHomeShare) < 1e-12);
  assert.ok(expectedTeamPointShare(900, 900, 'Away') < 0.5);
});

test('estimates unknown doubles pairings deterministically from the player pools', () => {
  const neutralShare = expectedDoublesPointShareFromPool(
    [1000, 900, 800],
    [1000, 900, 800],
    'Neutral',
  );
  const homeShare = expectedDoublesPointShareFromPool(
    [1000, 900, 800],
    [1000, 900, 800],
    'Home',
  );

  assert.ok(neutralShare != null);
  assert.ok(homeShare != null);
  assert.ok(Math.abs(neutralShare - 0.5) < 1e-12);
  assert.ok(homeShare > 0.5);
});

test('builds expected match points without inventing a specific doubles pairing', () => {
  const result = calculateExpectedMatchPoints({
    singlesMatchups: [{ teamCi: 900, opponentCi: 900 }],
    teamDoublesPool: [1000, 800],
    opponentDoublesPool: [1000, 800],
    doublesContestCount: 1,
    venue: 'Neutral',
  });

  assert.ok(result);
  assert.equal(result.singlesExpectedPoints, 0.5);
  assert.equal(result.doublesExpectedPoints, 1);
  assert.equal(result.totalExpectedPoints, 1.5);
  assert.equal(result.maximumPoints, 3);
  assert.equal(result.expectedPointShare, 0.5);
});

test('uses the same +8 matchup layer for individual expected points', () => {
  assert.equal(expectedContestPointShare(900, 900), 0.5);
  assert.ok(expectedContestPointShare(900, 900, 'Home') > 0.5);
  assert.ok(expectedContestPointShare(900, 900, 'Away') < 0.5);
});
