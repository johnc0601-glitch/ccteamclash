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
  REGULAR_SEASON_WIN_PROBABILITY_CAP,
  regularSeasonChanceOfVictoryFromExpectedMargin,
  regularSeasonChanceOfVictoryFromExpectedPoints,
  SINGLES_HOME_CI_BONUS,
  STANDARD_MATCH_POINTS,
  TEAM_HOME_CI_BONUS,
  TEAM_STRENGTH_LABELS,
} from './TeamStrength';

test('uses canonical labels for each roster-information stage', () => {
  assert.equal(TEAM_STRENGTH_LABELS.activeRoster, 'Active Roster Strength');
  assert.equal(
    TEAM_STRENGTH_LABELS.confirmedAvailableRoster,
    'Confirmed Available Roster Strength',
  );
  assert.equal(TEAM_STRENGTH_LABELS.matchLineup, 'Match Lineup Strength');
});

test('locks the normal Clash scoring base at 36 points', () => {
  assert.equal(STANDARD_MATCH_POINTS, 36);
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

test('builds rated-contest expected points without inventing a specific doubles pairing', () => {
  const result = calculateExpectedMatchPoints({
    singlesMatchups: [{teamCi: 900, opponentCi: 900}],
    teamDoublesPool: [1000, 800],
    opponentDoublesPool: [1000, 800],
    doublesContestCount: 1,
    venue: 'Neutral',
  });

  assert.ok(result);
  assert.equal(result.standardMatchPoints, 36);
  assert.equal(result.singlesExpectedPoints, 0.5);
  assert.equal(result.doublesExpectedPoints, 1);
  assert.equal(result.ratedContestExpectedPoints, 1.5);
  assert.equal(result.opponentRatedContestExpectedPoints, 1.5);
  assert.deepEqual(result.teamStructuralPoints, {
    automaticPoints: 0,
    womenBonusExpectedPoints: 0,
    otherKnownPoints: 0,
    total: 0,
  });
  assert.equal(result.totalExpectedPoints, 1.5);
  assert.equal(result.opponentExpectedPoints, 1.5);
  assert.equal(result.expectedPointMargin, 0);
  assert.equal(result.modeledContestMaximumPoints, 3);
  assert.equal(result.ratedContestExpectedPointShare, 0.5);
  assert.equal(result.regularSeasonChanceOfVictory, 0.5);
});

test('adds automatic short-handed points after the ordinary rated-contest expectation', () => {
  const result = calculateExpectedMatchPoints({
    singlesMatchups: [{teamCi: 900, opponentCi: 900}],
    teamDoublesPool: [1000, 800],
    opponentDoublesPool: [1000, 800],
    doublesContestCount: 1,
    venue: 'Neutral',
    teamStructuralPoints: {automaticPoints: 2},
  });

  assert.ok(result);
  assert.equal(result.ratedContestExpectedPoints, 1.5);
  assert.equal(result.opponentRatedContestExpectedPoints, 1.5);
  assert.equal(result.teamStructuralPoints.automaticPoints, 2);
  assert.equal(result.teamStructuralPoints.total, 2);
  assert.equal(result.totalExpectedPoints, 3.5);
  assert.equal(result.opponentExpectedPoints, 1.5);
  assert.equal(result.expectedPointMargin, 2);
  assert.equal(result.modeledContestMaximumPoints, 3);
  assert.equal(result.ratedContestExpectedPointShare, 0.5);
  assert.ok(result.regularSeasonChanceOfVictory > 0.70);
  assert.ok(result.regularSeasonChanceOfVictory < 0.71);
});

test('keeps likely women bonus points explicit and separate from team strength', () => {
  const result = calculateExpectedMatchPoints({
    singlesMatchups: [{teamCi: 900, opponentCi: 900}],
    teamDoublesPool: [1000, 800],
    opponentDoublesPool: [1000, 800],
    doublesContestCount: 1,
    venue: 'Neutral',
    teamStructuralPoints: {womenBonusExpectedPoints: 1.25},
    opponentStructuralPoints: {womenBonusExpectedPoints: 0.25},
  });

  assert.ok(result);
  assert.equal(result.ratedContestExpectedPointShare, 0.5);
  assert.equal(result.teamStructuralPoints.womenBonusExpectedPoints, 1.25);
  assert.equal(result.opponentStructuralPoints.womenBonusExpectedPoints, 0.25);
  assert.equal(result.expectedPointMargin, 1);
  assert.ok(result.regularSeasonChanceOfVictory > 0.60);
  assert.ok(result.regularSeasonChanceOfVictory < 0.61);
});

test('supports asymmetric structural points without folding them into rated-contest share', () => {
  const result = calculateExpectedMatchPoints({
    singlesMatchups: [{teamCi: 900, opponentCi: 900}],
    teamDoublesPool: [1000, 800],
    opponentDoublesPool: [1000, 800],
    doublesContestCount: 1,
    venue: 'Neutral',
    teamStructuralPoints: {otherKnownPoints: -1},
    opponentStructuralPoints: {automaticPoints: 2},
  });

  assert.ok(result);
  assert.equal(result.ratedContestExpectedPointShare, 0.5);
  assert.equal(result.totalExpectedPoints, 0.5);
  assert.equal(result.opponentExpectedPoints, 3.5);
  assert.equal(result.expectedPointMargin, -3);
  assert.ok(result.regularSeasonChanceOfVictory < 0.22);
});

test('rejects non-finite structural inputs instead of contaminating a prediction', () => {
  assert.equal(
    calculateExpectedMatchPoints({
      singlesMatchups: [{teamCi: 900, opponentCi: 900}],
      teamDoublesPool: [1000, 800],
      opponentDoublesPool: [1000, 800],
      doublesContestCount: 1,
      teamStructuralPoints: {automaticPoints: Number.POSITIVE_INFINITY},
    }),
    undefined,
  );

  assert.equal(
    calculateExpectedMatchPoints({
      singlesMatchups: [{teamCi: 900, opponentCi: 900}],
      teamDoublesPool: [1000, 800],
      opponentDoublesPool: [1000, 800],
      doublesContestCount: 1,
      opponentStructuralPoints: {womenBonusExpectedPoints: Number.NaN},
    }),
    undefined,
  );
});

test('uses the same +8 matchup layer for individual expected points', () => {
  assert.equal(expectedContestPointShare(900, 900), 0.5);
  assert.ok(expectedContestPointShare(900, 900, 'Home') > 0.5);
  assert.ok(expectedContestPointShare(900, 900, 'Away') < 0.5);
});

test('maps expected point margin to a symmetric known-matchup chance of victory', () => {
  const even = regularSeasonChanceOfVictoryFromExpectedMargin(0);
  const plusOne = regularSeasonChanceOfVictoryFromExpectedMargin(1);
  const minusOne = regularSeasonChanceOfVictoryFromExpectedMargin(-1);

  assert.equal(even, 0.5);
  assert.ok(plusOne != null && plusOne > 0.60 && plusOne < 0.61);
  assert.ok(minusOne != null);
  assert.ok(Math.abs((plusOne ?? 0) + minusOne - 1) < 1e-12);
});

test('caps regular-season chance of victory at 95/5 to avoid false certainty', () => {
  assert.equal(
    regularSeasonChanceOfVictoryFromExpectedMargin(100),
    REGULAR_SEASON_WIN_PROBABILITY_CAP,
  );
  assert.equal(
    regularSeasonChanceOfVictoryFromExpectedMargin(-100),
    1 - REGULAR_SEASON_WIN_PROBABILITY_CAP,
  );
});

test('derives known-matchup chance of victory from the expected score margin', () => {
  assert.equal(regularSeasonChanceOfVictoryFromExpectedPoints(18, 18), 0.5);
  assert.ok((regularSeasonChanceOfVictoryFromExpectedPoints(19, 17) ?? 0) > 0.70);
  assert.equal(regularSeasonChanceOfVictoryFromExpectedPoints(Number.NaN, 17), undefined);
});
