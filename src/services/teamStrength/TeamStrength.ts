export const TEAM_STRENGTH_VERSION = 'team-strength-v1';

export const TEAM_STRENGTH_WEIGHTS = {
  topSix: 0.35,
  nextSix: 0.35,
  depth: 0.30,
} as const;

export const TEAM_STRENGTH_LABELS = {
  activeRoster: 'Active Roster Strength',
  availableRoster: 'Available Roster Strength',
  matchLineup: 'Match Lineup Strength',
} as const;

// Historical calibration: 42 team matches / 2,568 player-result facts.
// Active Roster Strength itself is venue-neutral. The +8 is applied only in
// the matchup prediction layer so it cannot become part of a team's identity.
export const TEAM_HOME_CI_BONUS = 8;
export const TEAM_POINT_SHARE_SCALE = 105;
export const MATCHUP_POINT_SHARE_SCALE = 100;

// Format-level home effects remain available to the CI/statistics layer. The
// regular-season expected-points model below intentionally uses the single +8
// matchup adjustment for both formats.
export const SINGLES_HOME_CI_BONUS = 15;
export const DOUBLES_HOME_CI_BONUS = 8;
export const DOUBLES_STRONG_PLAYER_WEIGHT = 0.8;
export const DOUBLES_WEAK_PLAYER_WEIGHT = 0.2;
export const DOUBLES_TEAM_POINTS_PER_CONTEST = 2;

export type TeamStrengthConfidence = 'Low' | 'Partial' | 'Full';
export type TeamVenue = 'Home' | 'Neutral' | 'Away';

export type ActiveRosterStrengthBreakdown = {
  version: typeof TEAM_STRENGTH_VERSION;
  playerCount: number;
  confidence: TeamStrengthConfidence;
  topSixCi: number;
  nextSixCi: number;
  depthCi: number;
  activeRosterStrength: number;
};

export type SinglesMatchup = {
  teamCi: number;
  opponentCi: number;
};

export type ExpectedMatchPointsBreakdown = {
  version: typeof TEAM_STRENGTH_VERSION;
  venue: TeamVenue;
  singlesContestCount: number;
  doublesContestCount: number;
  singlesExpectedPoints: number;
  doublesExpectedPoints: number;
  totalExpectedPoints: number;
  maximumPoints: number;
  expectedPointShare: number;
};

/**
 * Calculates venue-neutral strength from the players currently on a team's
 * active season roster. Callers are responsible for passing only active roster
 * members with a valid CI.
 */
export function calculateActiveRosterStrength(
  clashIndices: readonly number[],
): ActiveRosterStrengthBreakdown | undefined {
  const ratings = validRatings(clashIndices).sort((a, b) => b - a);

  if (!ratings.length) return undefined;

  const topSix = ratings.slice(0, 6);
  const nextSix = ratings.slice(6, 12);
  const depth = ratings.slice(12);

  const topSixCi = average(topSix);
  const nextSixCi = nextSix.length ? average(nextSix) : topSixCi;
  // The historical model substitutes the middle tier when a roster has no
  // measured depth. Confidence communicates that the resulting score is thin.
  const depthCi = depth.length ? average(depth) : nextSixCi;

  const activeRosterStrength =
    TEAM_STRENGTH_WEIGHTS.topSix * topSixCi +
    TEAM_STRENGTH_WEIGHTS.nextSix * nextSixCi +
    TEAM_STRENGTH_WEIGHTS.depth * depthCi;

  return {
    version: TEAM_STRENGTH_VERSION,
    playerCount: ratings.length,
    confidence: confidenceForPlayerCount(ratings.length),
    topSixCi,
    nextSixCi,
    depthCi,
    activeRosterStrength,
  };
}

/**
 * Early-stage prediction from two venue-neutral roster strengths. Venue is
 * applied here exactly once.
 */
export function expectedTeamPointShare(
  teamBaseStrength: number,
  opponentBaseStrength: number,
  venue: TeamVenue = 'Neutral',
): number {
  const difference =
    teamBaseStrength - opponentBaseStrength + venueCiAdjustment(venue);
  return ratingExpectation(difference, TEAM_POINT_SHARE_SCALE);
}

export function expectedMatchPointsFromRosterStrength(
  teamBaseStrength: number,
  opponentBaseStrength: number,
  maximumPoints: number,
  venue: TeamVenue = 'Neutral',
): number | undefined {
  if (!Number.isFinite(maximumPoints) || maximumPoints <= 0) return undefined;
  return expectedTeamPointShare(teamBaseStrength, opponentBaseStrength, venue) * maximumPoints;
}

/**
 * Contest expectation for the regular-season expected-points model. This uses
 * the single league-wide +8 home adjustment rather than format-specific CI
 * adjustments.
 */
export function expectedContestPointShare(
  teamCi: number,
  opponentCi: number,
  venue: TeamVenue = 'Neutral',
): number {
  const difference = teamCi - opponentCi + venueCiAdjustment(venue);
  return ratingExpectation(difference, MATCHUP_POINT_SHARE_SCALE);
}

export function effectiveDoublesCi(playerOneCi: number, playerTwoCi: number): number {
  const stronger = Math.max(playerOneCi, playerTwoCi);
  const weaker = Math.min(playerOneCi, playerTwoCi);
  return stronger * DOUBLES_STRONG_PLAYER_WEIGHT + weaker * DOUBLES_WEAK_PLAYER_WEIGHT;
}

/**
 * Deterministic substitute for guessing doubles teams. Every plausible pair in
 * each player pool is evaluated with the locked 80/20 doubles rule, then the
 * resulting contest expectations are averaged. No Monte Carlo is required.
 *
 * Historical check: when actual singles matchups were known but doubles pairs
 * were hidden, this method plus the +8 matchup home effect predicted 38 of 41
 * decided historical team matches, the same winner count as using the actual
 * doubles pairings. Pairings still improved score calibration, so they should
 * replace this estimate once the lineup is locked.
 */
export function expectedDoublesPointShareFromPool(
  teamClashIndices: readonly number[],
  opponentClashIndices: readonly number[],
  venue: TeamVenue = 'Neutral',
): number | undefined {
  const teamPairs = possibleDoublesPairStrengths(teamClashIndices);
  const opponentPairs = possibleDoublesPairStrengths(opponentClashIndices);

  if (!teamPairs.length || !opponentPairs.length) return undefined;

  let totalExpectation = 0;
  let comparisonCount = 0;

  for (const teamPairCi of teamPairs) {
    for (const opponentPairCi of opponentPairs) {
      totalExpectation += expectedContestPointShare(teamPairCi, opponentPairCi, venue);
      comparisonCount += 1;
    }
  }

  return totalExpectation / comparisonCount;
}

/**
 * Regular-season hybrid once singles matchups are known: exact singles
 * expectations plus an all-plausible-pairs doubles estimate. Doubles contests
 * are worth two team points because both players in the pair contribute a team
 * point in the historical scoring ledger.
 */
export function calculateExpectedMatchPoints(input: {
  singlesMatchups: readonly SinglesMatchup[];
  teamDoublesPool: readonly number[];
  opponentDoublesPool: readonly number[];
  doublesContestCount: number;
  venue?: TeamVenue;
}): ExpectedMatchPointsBreakdown | undefined {
  const venue = input.venue ?? 'Neutral';
  const singlesMatchups = input.singlesMatchups.filter(
    (matchup) => isValidRating(matchup.teamCi) && isValidRating(matchup.opponentCi),
  );
  const doublesContestCount = Number.isFinite(input.doublesContestCount)
    ? Math.max(0, Math.floor(input.doublesContestCount))
    : 0;

  const doublesPointShare = doublesContestCount
    ? expectedDoublesPointShareFromPool(
        input.teamDoublesPool,
        input.opponentDoublesPool,
        venue,
      )
    : 0;

  if (doublesContestCount && doublesPointShare == null) return undefined;

  const singlesExpectedPoints = singlesMatchups.reduce(
    (sum, matchup) =>
      sum + expectedContestPointShare(matchup.teamCi, matchup.opponentCi, venue),
    0,
  );
  const doublesExpectedPoints =
    (doublesPointShare ?? 0) *
    doublesContestCount *
    DOUBLES_TEAM_POINTS_PER_CONTEST;
  const maximumPoints =
    singlesMatchups.length +
    doublesContestCount * DOUBLES_TEAM_POINTS_PER_CONTEST;

  if (!maximumPoints) return undefined;

  const totalExpectedPoints = singlesExpectedPoints + doublesExpectedPoints;

  return {
    version: TEAM_STRENGTH_VERSION,
    venue,
    singlesContestCount: singlesMatchups.length,
    doublesContestCount,
    singlesExpectedPoints,
    doublesExpectedPoints,
    totalExpectedPoints,
    maximumPoints,
    expectedPointShare: totalExpectedPoints / maximumPoints,
  };
}

export function homeCiBonusForFormat(format: 'Singles' | 'Doubles'): number {
  return format === 'Singles' ? SINGLES_HOME_CI_BONUS : DOUBLES_HOME_CI_BONUS;
}

function possibleDoublesPairStrengths(clashIndices: readonly number[]): number[] {
  const ratings = validRatings(clashIndices);
  const pairs: number[] = [];

  for (let first = 0; first < ratings.length; first += 1) {
    for (let second = first + 1; second < ratings.length; second += 1) {
      pairs.push(effectiveDoublesCi(ratings[first], ratings[second]));
    }
  }

  return pairs;
}

function venueCiAdjustment(venue: TeamVenue): number {
  if (venue === 'Home') return TEAM_HOME_CI_BONUS;
  if (venue === 'Away') return -TEAM_HOME_CI_BONUS;
  return 0;
}

function ratingExpectation(difference: number, scale: number): number {
  return 1 / (1 + Math.pow(10, -difference / scale));
}

function validRatings(values: readonly number[]): number[] {
  return values.filter(isValidRating).slice();
}

function isValidRating(rating: number): boolean {
  return Number.isFinite(rating) && rating > 0;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function confidenceForPlayerCount(playerCount: number): TeamStrengthConfidence {
  if (playerCount >= 18) return 'Full';
  if (playerCount >= 12) return 'Partial';
  return 'Low';
}
