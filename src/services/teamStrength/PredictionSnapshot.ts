import type {PredictionReadiness, RosterBasedMatchPrediction} from './MatchPrediction';
import type {RosterStrengthResult, TeamStrengthSource} from './RosterStrength';
import type {TeamStrengthConfidence, TeamVenue} from './TeamStrength';

export const TEAM_STRENGTH_CAPTURE_REASONS = {
  activeRoster: 'PreMatch',
  confirmedAvailableRoster: 'AttendanceFinal',
  matchLineup: 'RosterLock',
} as const;

export type TeamStrengthCaptureReason =
  (typeof TEAM_STRENGTH_CAPTURE_REASONS)[TeamStrengthSource];

export type TeamStrengthPredictionSnapshot = {
  matchId: string;
  teamId: string;
  opponentTeamId: string;
  side: 'Home' | 'Away';
  source: TeamStrengthSource;
  captureReason: TeamStrengthCaptureReason;
  strengthLabel: string;
  modelVersion: string;
  capturedAt: string;
  venue: TeamVenue;
  confidence: TeamStrengthConfidence;
  predictionReadiness: PredictionReadiness;
  calibrationSlope: number;
  teamBaseStrength: number;
  opponentBaseStrength: number;
  matchupStrengthDifference: number;
  expectedPointShare: number;
  /** Raw calibrated value retained even when the public readiness gate hides it. */
  chanceOfVictory: number;
  teamPlayerIds: string[];
  opponentPlayerIds: string[];
  teamPlayerCount: number;
  opponentPlayerCount: number;
  teamProvisionalPlayerCount: number;
  opponentProvisionalPlayerCount: number;
  teamFallbackPlayerCount: number;
  opponentFallbackPlayerCount: number;
  teamOmittedPlayerCount: number;
  opponentOmittedPlayerCount: number;
};

/**
 * Creates the immutable payload needed to calibrate the roster stages after
 * future seasons. The archive currently lacks these point-in-time inputs, so
 * the source/capture reason is derived rather than caller-authored.
 */
export function buildTeamStrengthPredictionSnapshot(input: {
  matchId: string;
  teamId: string;
  opponentTeamId: string;
  side: 'Home' | 'Away';
  prediction: RosterBasedMatchPrediction;
  teamStrength: RosterStrengthResult;
  opponentStrength: RosterStrengthResult;
  capturedAt?: string;
}): TeamStrengthPredictionSnapshot | undefined {
  const {
    prediction,
    teamStrength,
    opponentStrength,
  } = input;

  if (
    !input.matchId.trim()
    || !input.teamId.trim()
    || !input.opponentTeamId.trim()
    || input.teamId === input.opponentTeamId
    || prediction.source !== teamStrength.source
    || prediction.source !== opponentStrength.source
    || teamStrength.source !== opponentStrength.source
  ) return undefined;

  const capturedAt = input.capturedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(capturedAt))) return undefined;

  return {
    matchId: input.matchId,
    teamId: input.teamId,
    opponentTeamId: input.opponentTeamId,
    side: input.side,
    source: prediction.source,
    captureReason: TEAM_STRENGTH_CAPTURE_REASONS[prediction.source],
    strengthLabel: teamStrength.label,
    modelVersion: prediction.version,
    capturedAt,
    venue: prediction.venue,
    confidence: prediction.confidence,
    predictionReadiness: prediction.readiness,
    calibrationSlope: prediction.calibrationSlope,
    teamBaseStrength: prediction.teamBaseStrength,
    opponentBaseStrength: prediction.opponentBaseStrength,
    matchupStrengthDifference: prediction.matchupStrengthDifference,
    expectedPointShare: prediction.expectedPointShare,
    chanceOfVictory: prediction.regularSeasonChanceOfVictory,
    teamPlayerIds: sortedUnique(teamStrength.playerIds),
    opponentPlayerIds: sortedUnique(opponentStrength.playerIds),
    teamPlayerCount: teamStrength.rosterPlayerCount,
    opponentPlayerCount: opponentStrength.rosterPlayerCount,
    teamProvisionalPlayerCount: teamStrength.provisionalPlayerCount,
    opponentProvisionalPlayerCount: opponentStrength.provisionalPlayerCount,
    teamFallbackPlayerCount: teamStrength.fallbackPlayerCount,
    opponentFallbackPlayerCount: opponentStrength.fallbackPlayerCount,
    teamOmittedPlayerCount: teamStrength.omittedPlayerCount,
    opponentOmittedPlayerCount: opponentStrength.omittedPlayerCount,
  };
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
