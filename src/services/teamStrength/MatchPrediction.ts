import {
  expectedTeamPointShare,
  REGULAR_SEASON_WIN_PROBABILITY_CAP,
  TEAM_HOME_CI_BONUS,
  STANDARD_MATCH_POINTS,
  type TeamStrengthConfidence,
  type TeamVenue,
} from './TeamStrength';
import type {RosterStrengthResult, TeamStrengthSource} from './RosterStrength';

export const CI_ESTIMATE_VERSION = 'ci-model-estimates-v2';
export const CI_ESTIMATE_MARGIN_SLOPE = 0.20;

// Retain v1 strength slopes only for legacy retrospective analysis.
// Captain-facing v2 estimates use the margin slope above.
export const ACTIVE_ROSTER_WIN_STRENGTH_SLOPE = 0.088;
export const CONFIRMED_AVAILABLE_WIN_STRENGTH_SLOPE = 0.088;
export const MATCH_LINEUP_WIN_STRENGTH_SLOPE = 0.117;

export type PredictionReadiness = 'Unavailable' | 'EarlyEstimate' | 'Ready';

export type RosterBasedMatchPrediction = {
  version: typeof CI_ESTIMATE_VERSION;
  source: TeamStrengthSource;
  strengthLabel: string;
  venue: TeamVenue;
  confidence: TeamStrengthConfidence;
  readiness: PredictionReadiness;
  displayLabel: 'Prediction unavailable' | 'Early estimate' | 'Chance of Victory';
  /** Venue-neutral stage strength. */
  teamBaseStrength: number;
  /** Venue-neutral opponent strength at the same information stage. */
  opponentBaseStrength: number;
  matchupStrengthDifference: number;
  expectedPointShare: number;
  calibrationSlope: number;
  /** Internal calibrated value retained for auditing and future calibration. */
  regularSeasonChanceOfVictory: number;
  /** Null when the data-quality gate says a percentage should not be published. */
  displayChanceOfVictory: number | null;
};

/**
 * Regular-season prediction from two neutral strengths at the same information
 * stage. Venue is applied exactly once in this prediction layer.
 *
 * All stages use the conservative expected-point-margin curve.
 * Match Lineup is the final public
 * pre-match stage. Exact singles/doubles pairings are used only after the match
 * for retrospective analysis/calibration; they never upgrade the public forecast.
 */
export function calculateRosterBasedMatchPrediction(input: {
  team: RosterStrengthResult;
  opponent: RosterStrengthResult;
  venue?: TeamVenue;
}): RosterBasedMatchPrediction | undefined {
  const {team, opponent} = input;
  const venue = input.venue ?? 'Neutral';

  if (team.source !== opponent.source) return undefined;

  const matchupStrengthDifference =
    team.baseStrength - opponent.baseStrength + venueCiAdjustment(venue);
  const expectedPointShare = expectedTeamPointShare(
    team.baseStrength,
    opponent.baseStrength,
    venue,
  );
  const calibrationSlope = CI_ESTIMATE_MARGIN_SLOPE;
  const regularSeasonChanceOfVictory = boundedLogistic(
    STANDARD_MATCH_POINTS * (2 * expectedPointShare - 1),
    calibrationSlope,
  );
  const confidence = lowerConfidence(team.confidence, opponent.confidence);
  const readiness = predictionReadinessForStrengths(team, opponent);
  const presentation = presentationForReadiness(
    readiness,
    regularSeasonChanceOfVictory,
  );

  return {
    version: CI_ESTIMATE_VERSION,
    source: team.source,
    strengthLabel: team.label,
    venue,
    confidence,
    readiness,
    displayLabel: presentation.label,
    teamBaseStrength: team.baseStrength,
    opponentBaseStrength: opponent.baseStrength,
    matchupStrengthDifference,
    expectedPointShare,
    calibrationSlope,
    regularSeasonChanceOfVictory,
    displayChanceOfVictory: presentation.chanceOfVictory,
  };
}

/**
 * Publication gate for roster-stage predictions.
 *
 * Active Roster and Confirmed Available are always early estimates even when
 * every underlying CI is measured. Those stages still contain lineup
 * uncertainty, and their current probability curves rely on historical proxies.
 * A finished "Chance of Victory" label is reserved for a complete, measured
 * Match Lineup. Missing players block percentage publication entirely.
 */
export function predictionReadinessForStrengths(
  team: RosterStrengthResult,
  opponent: RosterStrengthResult,
): PredictionReadiness {
  if (team.source !== opponent.source) return 'Unavailable';
  if (team.omittedPlayerCount > 0 || opponent.omittedPlayerCount > 0) {
    return 'Unavailable';
  }

  if (team.source !== 'matchLineup') return 'EarlyEstimate';

  if (
    team.confidence !== 'Full'
    || opponent.confidence !== 'Full'
    || team.provisionalPlayerCount > 0
    || opponent.provisionalPlayerCount > 0
    || team.fallbackPlayerCount > 0
    || opponent.fallbackPlayerCount > 0
  ) {
    return 'EarlyEstimate';
  }

  return 'Ready';
}

export function rosterStageChanceOfVictoryFromStrengthDifference(
  matchupStrengthDifference: number,
  source: TeamStrengthSource = 'activeRoster',
): number {
  // Legacy retrospective helper: frozen v1 analyses keep their original curve.
  const slope = source === 'matchLineup' ? MATCH_LINEUP_WIN_STRENGTH_SLOPE : ACTIVE_ROSTER_WIN_STRENGTH_SLOPE;
  return boundedLogistic(matchupStrengthDifference, slope);
}

function presentationForReadiness(
  readiness: PredictionReadiness,
  chanceOfVictory: number,
): {
  label: RosterBasedMatchPrediction['displayLabel'];
  chanceOfVictory: number | null;
} {
  if (readiness === 'Unavailable') {
    return {label: 'Prediction unavailable', chanceOfVictory: null};
  }
  if (readiness === 'EarlyEstimate') {
    return {label: 'Early estimate', chanceOfVictory};
  }
  return {label: 'Chance of Victory', chanceOfVictory};
}

function boundedLogistic(
  difference: number,
  slope: number,
): number {
  if (!Number.isFinite(difference)) return 0.5;

  const rawProbability = 1 / (
    1 + Math.exp(-slope * difference)
  );
  const floor = 1 - REGULAR_SEASON_WIN_PROBABILITY_CAP;

  return Math.min(
    REGULAR_SEASON_WIN_PROBABILITY_CAP,
    Math.max(floor, rawProbability),
  );
}

function venueCiAdjustment(venue: TeamVenue): number {
  if (venue === 'Home') return TEAM_HOME_CI_BONUS;
  if (venue === 'Away') return -TEAM_HOME_CI_BONUS;
  return 0;
}

function lowerConfidence(
  left: TeamStrengthConfidence,
  right: TeamStrengthConfidence,
): TeamStrengthConfidence {
  const rank: Record<TeamStrengthConfidence, number> = {
    Low: 0,
    Partial: 1,
    Full: 2,
  };

  return rank[left] <= rank[right] ? left : right;
}
