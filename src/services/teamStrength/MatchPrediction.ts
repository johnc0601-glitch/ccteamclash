import {
  expectedTeamPointShare,
  REGULAR_SEASON_WIN_PROBABILITY_CAP,
  TEAM_STRENGTH_VERSION,
  type TeamStrengthConfidence,
  type TeamVenue,
} from './TeamStrength';
import type {RosterStrengthResult, TeamStrengthSource} from './RosterStrength';

// Regular-season historical calibration for the roster-strength stage. The
// available archive has no point-in-time attendance snapshots, so Confirmed
// Available Roster Strength intentionally uses the same conservative curve
// until enough future attendance history exists to fit it independently.
export const ROSTER_STAGE_WIN_MARGIN_SLOPE = 0.33;

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
  maximumPoints: number;
  expectedPointShare: number;
  teamExpectedPoints: number;
  opponentExpectedPoints: number;
  expectedPointMargin: number;
  regularSeasonChanceOfVictory: number;
};

/**
 * Early regular-season prediction from stage-specific neutral roster strength.
 *
 * Both sides must come from the same information stage. Match Lineup Strength
 * is deliberately rejected here because a locked lineup should use the
 * contest-level expected-points model rather than collapsing back to one roster
 * number. Venue is applied exactly once by expectedTeamPointShare().
 */
export function calculateRosterBasedMatchPrediction(input: {
  team: RosterStrengthResult;
  opponent: RosterStrengthResult;
  maximumPoints: number;
  venue?: TeamVenue;
}): RosterBasedMatchPrediction | undefined {
  const {team, opponent} = input;
  const venue = input.venue ?? 'Neutral';

  if (team.source !== opponent.source) return undefined;
  if (team.source === 'matchLineup') return undefined;
  if (!Number.isFinite(input.maximumPoints) || input.maximumPoints <= 0) return undefined;

  const maximumPoints = input.maximumPoints;
  const expectedPointShare = expectedTeamPointShare(
    team.activeRosterStrength,
    opponent.activeRosterStrength,
    venue,
  );
  const teamExpectedPoints = expectedPointShare * maximumPoints;
  const opponentExpectedPoints = maximumPoints - teamExpectedPoints;
  const expectedPointMargin = teamExpectedPoints - opponentExpectedPoints;
  const regularSeasonChanceOfVictory = rosterStageChanceOfVictoryFromExpectedMargin(
    expectedPointMargin,
  );

  return {
    version: TEAM_STRENGTH_VERSION,
    source: team.source,
    strengthLabel: team.label,
    venue,
    confidence: lowerConfidence(team.confidence, opponent.confidence),
    teamBaseStrength: team.activeRosterStrength,
    opponentBaseStrength: opponent.activeRosterStrength,
    maximumPoints,
    expectedPointShare,
    teamExpectedPoints,
    opponentExpectedPoints,
    expectedPointMargin,
    regularSeasonChanceOfVictory,
  };
}

/**
 * Roster-stage Chance of Victory is intentionally flatter than the later
 * known-matchup curve because the roster stage contains more lineup uncertainty.
 */
export function rosterStageChanceOfVictoryFromExpectedMargin(
  expectedPointMargin: number,
): number {
  if (!Number.isFinite(expectedPointMargin)) return 0.5;

  const rawProbability = 1 / (
    1 + Math.exp(-ROSTER_STAGE_WIN_MARGIN_SLOPE * expectedPointMargin)
  );
  const floor = 1 - REGULAR_SEASON_WIN_PROBABILITY_CAP;

  return Math.min(
    REGULAR_SEASON_WIN_PROBABILITY_CAP,
    Math.max(floor, rawProbability),
  );
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
