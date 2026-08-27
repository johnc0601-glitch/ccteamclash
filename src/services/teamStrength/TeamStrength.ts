export const TEAM_STRENGTH_VERSION = 'team-strength-v1';

export const TEAM_STRENGTH_WEIGHTS = {
  topSix: 0.35,
  nextSix: 0.35,
  depth: 0.30,
} as const;

// Historical calibration: 42 team matches / 2,568 player-result facts.
// Keep the roster-level home adjustment league-wide until more home-match
// history exists; team-specific home effects overfit the current sample.
export const TEAM_HOME_CI_BONUS = 8;
export const TEAM_POINT_SHARE_SCALE = 105;

// Format-level home effects are used once an actual lineup is known.
export const SINGLES_HOME_CI_BONUS = 15;
export const DOUBLES_HOME_CI_BONUS = 8;
export const DOUBLES_STRONG_PLAYER_WEIGHT = 0.8;
export const DOUBLES_WEAK_PLAYER_WEIGHT = 0.2;

export type TeamStrengthConfidence = 'Low' | 'Partial' | 'Full';

export type TeamStrengthBreakdown = {
  version: typeof TEAM_STRENGTH_VERSION;
  playerCount: number;
  confidence: TeamStrengthConfidence;
  topSixCi: number;
  nextSixCi: number;
  depthCi: number;
  neutralStrength: number;
  homeStrength: number;
};

export function calculateRosterStrength(clashIndices: readonly number[]): TeamStrengthBreakdown | undefined {
  const ratings = clashIndices
    .filter((rating) => Number.isFinite(rating) && rating > 0)
    .slice()
    .sort((a, b) => b - a);

  if (!ratings.length) return undefined;

  const topSix = ratings.slice(0, 6);
  const nextSix = ratings.slice(6, 12);
  const depth = ratings.slice(12);

  const topSixCi = average(topSix);
  const nextSixCi = nextSix.length ? average(nextSix) : topSixCi;
  // The historical model substitutes the middle tier when a roster has no
  // measured depth. Confidence communicates that the resulting score is thin.
  const depthCi = depth.length ? average(depth) : nextSixCi;

  const neutralStrength =
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
    neutralStrength,
    homeStrength: neutralStrength + TEAM_HOME_CI_BONUS,
  };
}

export function expectedTeamPointShare(
  teamStrength: number,
  opponentStrength: number,
  venue: 'Home' | 'Neutral' | 'Away' = 'Neutral',
): number {
  const venueAdjustment = venue === 'Home' ? TEAM_HOME_CI_BONUS : venue === 'Away' ? -TEAM_HOME_CI_BONUS : 0;
  const difference = teamStrength - opponentStrength + venueAdjustment;
  return 1 / (1 + Math.pow(10, -difference / TEAM_POINT_SHARE_SCALE));
}

export function effectiveDoublesCi(playerOneCi: number, playerTwoCi: number): number {
  const stronger = Math.max(playerOneCi, playerTwoCi);
  const weaker = Math.min(playerOneCi, playerTwoCi);
  return stronger * DOUBLES_STRONG_PLAYER_WEIGHT + weaker * DOUBLES_WEAK_PLAYER_WEIGHT;
}

export function homeCiBonusForFormat(format: 'Singles' | 'Doubles'): number {
  return format === 'Singles' ? SINGLES_HOME_CI_BONUS : DOUBLES_HOME_CI_BONUS;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function confidenceForPlayerCount(playerCount: number): TeamStrengthConfidence {
  if (playerCount >= 18) return 'Full';
  if (playerCount >= 12) return 'Partial';
  return 'Low';
}
