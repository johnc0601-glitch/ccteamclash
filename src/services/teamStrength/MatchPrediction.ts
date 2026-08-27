import {
  expectedTeamPointShare,
  REGULAR_SEASON_WIN_PROBABILITY_CAP,
  TEAM_HOME_CI_BONUS,
  TEAM_STRENGTH_VERSION,
  type TeamStrengthConfidence,
  type TeamVenue,
} from './TeamStrength';
import type {RosterStrengthResult, TeamStrengthSource} from './RosterStrength';

// Regular-season historical calibration for the roster-strength stage. The
// available archive has no point-in-time attendance snapshots, so Confirmed
// Available Roster Strength intentionally uses the same conservative curve
// until enough future attendance history exists to fit it independently.
//
// This is fit directly to neutral roster-strength difference + the +8 matchup
// home effect. That avoids inventing a match point total before attendance and
// lineup size are actually known.
export const ROSTER_STAGE_WIN_STRENGTH_SLOPE = 0.117;

export type RosterPredictionSource = Extract<
  TeamStrengthSource,
  'activeRoster' | 'confirmedAvailableRoster'
>;

export type RosterBasedMatchPrediction = {
  version: typeof TEAM_STRENGTH_VERSION;
  source: RosterPredictionSource;
  strengthLabel: string;
  venue: TeamVenue;
  confidence: TeamStrengthConfidence;
  teamBaseStrength: number;
  opponentBaseStrength: number;
  matchupStrengthDifference: number;
  expectedPointShare: number;
  regularSeasonChanceOfVictory: number;
};

/**
 * Early regular-season prediction from stage-specific neutral roster strength.
 *
 * Both sides must come from the same information stage. Match Lineup Strength
 * is deliberately rejected here because a locked lineup should use the
 * contest-level expected-points model rather than collapsing back to one roster
 * number. Venue is applied exactly once in this prediction layer.
 */
export function calculateRosterBasedMatchPrediction(input: {
  team: RosterStrengthResult;
  opponent: RosterStrengthResult;
  venue?: TeamVenue;
}): RosterBasedMatchPrediction | undefined {
  const {team, opponent} = input;
  const venue = input.venue ?? 'Neutral';

  if (team.source !== opponent.source) return undefined;
  if (team.source === 'matchLineup') return undefined;

  const matchupStrengthDifference =
    team.activeRosterStrength -
    opponent.activeRosterStrength +
    venueCiAdjustment(venue);
  const expectedPointShare = expectedTeamPointShare(
    team.activeRosterStrength,
    opponent.activeRosterStrength,
    venue,
  );
  const regularSeasonChanceOfVictory = rosterStageChanceOfVictoryFromStrengthDifference(
    matchupStrengthDifference,
  );

  return {
    version: TEAM_STRENGTH_VERSION,
    source: team.source,
    strengthLabel: team.label,
    venue,
    confidence: lowerConfidence(team.confidence, opponent.confidence),
    teamBaseStrength: team.activeRosterStrength,
    opponentBaseStrength: opponent.activeRosterStrength,
    matchupStrengthDifference,
    expectedPointShare,
    regularSeasonChanceOfVictory,
  };
}

/**
 * Roster-stage Chance of Victory uses CI-strength difference directly because
 * early in the week the number of eventual scoring slots is not yet known.
 */
export function rosterStageChanceOfVictoryFromStrengthDifference(
  matchupStrengthDifference: number,
): number {
  if (!Number.isFinite(matchupStrengthDifference)) return 0.5;

  const rawProbability = 1 / (
    1 + Math.exp(-ROSTER_STAGE_WIN_STRENGTH_SLOPE * matchupStrengthDifference)
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
