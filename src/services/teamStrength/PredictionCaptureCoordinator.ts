import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';
import type {MatchStatus} from '@/domain/schedule/Match';
import {
  captureRosterPredictionStage,
  type MatchVenueClassification,
  type PredictionCaptureResult,
} from './PredictionLifecycle';
import {predictionCaptureEligibility} from './PredictionCaptureSchedule';
import type {PredictionSnapshotRepository} from './PredictionSnapshotRepository';
import {calculateMatchStageStrengthPair} from './PredictionStageStrength';

const CAPTURE_ELIGIBLE_STATUSES = new Set<MatchStatus>([
  'Scheduled',
  'Postponed',
  'Rain Delay',
]);

export type PredictionCaptureCoordinatorInput = {
  repository: PredictionSnapshotRepository;
  matchId: string;
  matchDate: string;
  matchStatus: MatchStatus;
  homeTeamId: string;
  awayTeamId: string;
  matchVenue: MatchVenueClassification;
  homePlayers: readonly LaunchPlayer[];
  awayPlayers: readonly LaunchPlayer[];
  homeAttendance?: readonly TeamAttendanceMember[];
  awayAttendance?: readonly TeamAttendanceMember[];
  officialRosters?: readonly OfficialMatchRoster[];
  now?: Date;
};

export type PredictionCaptureCoordinatorResult =
  | PredictionCaptureResult
  | {captured: false; reason: 'NotDue' | 'Expired' | 'NotEligible' | 'MissingInputs'};

/**
 * Coordinates one roster-stage capture using only data that is valid in the
 * current lifecycle window. It intentionally refuses to backfill an earlier
 * stage from later information and refuses post-result or expired capture,
 * preventing today's CI from leaking into a historical pre-match snapshot.
 */
export async function captureCurrentRosterPrediction(
  input: PredictionCaptureCoordinatorInput,
): Promise<PredictionCaptureCoordinatorResult> {
  if (!CAPTURE_ELIGIBLE_STATUSES.has(input.matchStatus)) {
    return {captured: false, reason: 'NotEligible'};
  }

  const now = input.now ?? new Date();
  const eligibility = predictionCaptureEligibility(input.matchDate, now);
  if (!eligibility.eligible) {
    return {captured: false, reason: eligibility.reason};
  }
  const source = eligibility.source;

  const strengths = calculateMatchStageStrengthPair({
    source,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    homePlayers: input.homePlayers,
    awayPlayers: input.awayPlayers,
    homeAttendance: input.homeAttendance,
    awayAttendance: input.awayAttendance,
    officialRosters: input.officialRosters,
  });
  if (!strengths) return {captured: false, reason: 'MissingInputs'};

  return captureRosterPredictionStage({
    repository: input.repository,
    matchId: input.matchId,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    homeStrength: strengths.home,
    awayStrength: strengths.away,
    matchVenue: input.matchVenue,
    capturedAt: now.toISOString(),
  });
}
