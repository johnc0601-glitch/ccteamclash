export const TEAM_STRENGTH_VERSION = 'team-strength-v1';

export const TEAM_STRENGTH_WEIGHTS = {
  topSix: 0.35,
  nextSix: 0.35,
  depth: 0.30,
} as const;

export const TEAM_STRENGTH_LABELS = {
  activeRoster: 'Active Roster Strength',
  confirmedAvailableRoster: 'Confirmed Available Roster Strength',
  matchLineup: 'Match Lineup Strength',
} as const;

// A standard Clash has 36 points before structural scoring effects such as
// automatic points or women bonus opportunities are applied.
export const STANDARD_MATCH_POINTS = 36;

// Historical calibration: 42 team matches / 2,568 player-result facts.
// Roster strength itself is venue-neutral. The +8 is applied only in the
// matchup prediction layer so it cannot become part of a team's identity.
export const TEAM_HOME_CI_BONUS = 8;
export const TEAM_POINT_SHARE_SCALE = 105;
export const MATCHUP_POINT_SHARE_SCALE = 100;

// Known-matchup regular-season Chance of Victory calibration for post-match
// retrospective analysis. Actual recorded pairings feed Expected Point Margin
// and this slope; public roster-only stages use their own calibration curves.
export const REGULAR_SEASON_WIN_MARGIN_SLOPE = 0.43;
export const REGULAR_SEASON_WIN_PROBABILITY_CAP = 0.95;

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

/**
 * Match-specific scoring effects that are outside ordinary CI-rated contests.
 * These values must come from known Clash rules / lineup structure. V1 never
 * infers them silently from roster size or historical residuals.
 */
export type StructuralPointComponents = {
  automaticPoints?: number;
  womenBonusExpectedPoints?: number;
  otherKnownPoints?: number;
};

export type ResolvedStructuralPointComponents = {
  automaticPoints: number;
  womenBonusExpectedPoints: number;
  otherKnownPoints: number;
  total: number;
};

export type ExpectedMatchPointsBreakdown = {
  version: typeof TEAM_STRENGTH_VERSION;
  venue: TeamVenue;
  standardMatchPoints: typeof STANDARD_MATCH_POINTS;
  singlesContestCount: number;
  doublesContestCount: number;
  singlesExpectedPoints: number;
  doublesExpectedPoints: number;
  ratedContestExpectedPoints: number;
  opponentRatedContestExpectedPoints: number;
  teamStructuralPoints: ResolvedStructuralPointComponents;
  opponentStructuralPoints: ResolvedStructuralPointComponents;
  totalExpectedPoints: number;
  opponentExpectedPoints: number;
  expectedPointMargin: number;
  modeledContestMaximumPoints: number;
  ratedContestExpectedPointShare: number;
  regularSeasonChanceOfVictory: number;
};

/**
 * Calculates venue-neutral strength from a roster player pool.
 * Stage-specific adapters own which players belong in that pool.
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
 * Expected team point share from two venue-neutral roster strengths. Venue is
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
 * Contest expectation for post-match retrospective/calibration analysis. This
 * uses the single league-wide +8 home adjustment rather than format-specific CI
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
 * Deterministic calibration helper for a known player pool. Every plausible
 * pair is evaluated with the locked 80/20 doubles rule, then the resulting
 * contest expectations are averaged. This is not a public pre-match stage.
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
 * Legacy retrospective/calibration helper for recorded singles plus a pooled
 * doubles estimate. It is not used to upgrade the public pre-match forecast;
 * exact post-match pair analysis uses the recorded result contests directly.
 *
 * The ordinary CI-rated layer is kept separate from structural points. A short
 * roster can turn standard slots into automatic points; extra women can create
 * bonus-point opportunities. Those effects are supplied explicitly by the
 * rules/lineup layer and never alter Team Strength itself.
 */
export function calculateExpectedMatchPoints(input: {
  singlesMatchups: readonly SinglesMatchup[];
  teamDoublesPool: readonly number[];
  opponentDoublesPool: readonly number[];
  doublesContestCount: number;
  venue?: TeamVenue;
  teamStructuralPoints?: StructuralPointComponents;
  opponentStructuralPoints?: StructuralPointComponents;
}): ExpectedMatchPointsBreakdown | undefined {
  const venue = input.venue ?? 'Neutral';
  const singlesMatchups = input.singlesMatchups.filter(
    (matchup) => isValidRating(matchup.teamCi) && isValidRating(matchup.opponentCi),
  );
  const doublesContestCount = Number.isFinite(input.doublesContestCount)
    ? Math.max(0, Math.floor(input.doublesContestCount))
    : 0;
  const teamStructuralPoints = resolveStructuralPoints(input.teamStructuralPoints);
  const opponentStructuralPoints = resolveStructuralPoints(input.opponentStructuralPoints);

  if (!teamStructuralPoints || !opponentStructuralPoints) return undefined;

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
  const modeledContestMaximumPoints =
    singlesMatchups.length +
    doublesContestCount * DOUBLES_TEAM_POINTS_PER_CONTEST;

  if (!modeledContestMaximumPoints) return undefined;

  const ratedContestExpectedPoints = singlesExpectedPoints + doublesExpectedPoints;
  const opponentRatedContestExpectedPoints =
    modeledContestMaximumPoints - ratedContestExpectedPoints;
  const totalExpectedPoints = ratedContestExpectedPoints + teamStructuralPoints.total;
  const opponentExpectedPoints =
    opponentRatedContestExpectedPoints + opponentStructuralPoints.total;
  const expectedPointMargin = totalExpectedPoints - opponentExpectedPoints;
  const regularSeasonChanceOfVictory = regularSeasonChanceOfVictoryFromExpectedMargin(
    expectedPointMargin,
  );

  if (regularSeasonChanceOfVictory == null) return undefined;

  return {
    version: TEAM_STRENGTH_VERSION,
    venue,
    standardMatchPoints: STANDARD_MATCH_POINTS,
    singlesContestCount: singlesMatchups.length,
    doublesContestCount,
    singlesExpectedPoints,
    doublesExpectedPoints,
    ratedContestExpectedPoints,
    opponentRatedContestExpectedPoints,
    teamStructuralPoints,
    opponentStructuralPoints,
    totalExpectedPoints,
    opponentExpectedPoints,
    expectedPointMargin,
    modeledContestMaximumPoints,
    ratedContestExpectedPointShare:
      ratedContestExpectedPoints / modeledContestMaximumPoints,
    regularSeasonChanceOfVictory,
  };
}

/**
 * Converts Expected Point Margin to regular-season Chance of Victory for
 * post-match retrospective/calibration analysis once actual matchup structure
 * is recorded. Do not use this curve for public roster-only predictions or
 * playoffs.
 */
export function regularSeasonChanceOfVictoryFromExpectedMargin(
  expectedPointMargin: number,
): number | undefined {
  if (!Number.isFinite(expectedPointMargin)) return undefined;

  const rawProbability = 1 / (
    1 + Math.exp(-REGULAR_SEASON_WIN_MARGIN_SLOPE * expectedPointMargin)
  );
  const floor = 1 - REGULAR_SEASON_WIN_PROBABILITY_CAP;

  return Math.min(
    REGULAR_SEASON_WIN_PROBABILITY_CAP,
    Math.max(floor, rawProbability),
  );
}

export function regularSeasonChanceOfVictoryFromExpectedPoints(
  teamExpectedPoints: number,
  opponentExpectedPoints: number,
): number | undefined {
  if (!Number.isFinite(teamExpectedPoints) || !Number.isFinite(opponentExpectedPoints)) {
    return undefined;
  }

  return regularSeasonChanceOfVictoryFromExpectedMargin(
    teamExpectedPoints - opponentExpectedPoints,
  );
}

export function homeCiBonusForFormat(format: 'Singles' | 'Doubles'): number {
  return format === 'Singles' ? SINGLES_HOME_CI_BONUS : DOUBLES_HOME_CI_BONUS;
}

function resolveStructuralPoints(
  input?: StructuralPointComponents,
): ResolvedStructuralPointComponents | undefined {
  const automaticPoints = input?.automaticPoints ?? 0;
  const womenBonusExpectedPoints = input?.womenBonusExpectedPoints ?? 0;
  const otherKnownPoints = input?.otherKnownPoints ?? 0;

  if (
    !Number.isFinite(automaticPoints)
    || !Number.isFinite(womenBonusExpectedPoints)
    || !Number.isFinite(otherKnownPoints)
  ) return undefined;

  return {
    automaticPoints,
    womenBonusExpectedPoints,
    otherKnownPoints,
    total: automaticPoints + womenBonusExpectedPoints + otherKnownPoints,
  };
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
