import {
  getMatchAttendanceOpenAt,
  getMatchRosterLockAt,
  getPlayerAttendanceLockAt,
} from '@/domain/match-roster/MatchRosterLock';
import type {TeamStrengthSource} from './RosterStrength';

export type PredictionCaptureCheckpoint = {
  source: TeamStrengthSource;
  captureAt: Date;
};

export const MATCH_LINEUP_CAPTURE_GRACE_MS = 2 * 60 * 60 * 1000;

export type PredictionCaptureEligibility =
  | {eligible: true; source: TeamStrengthSource}
  | {eligible: false; reason: 'NotDue' | 'Expired'};

/**
 * Fixed regular-season Team Strength checkpoints.
 *
 * PreMatch is captured when match-week attendance opens (Friday 12:00 AM ET),
 * before availability data begins to replace the active-roster view.
 * AttendanceFinal is captured at the player response lock (Friday 12:00 PM ET).
 * MatchLineup is captured at the official roster lock (match date 3:00 PM ET).
 */
export function predictionCaptureCheckpoints(
  matchDate: string,
): PredictionCaptureCheckpoint[] {
  const preMatch = getMatchAttendanceOpenAt(matchDate);
  const attendanceFinal = getPlayerAttendanceLockAt(matchDate);
  const rosterLock = getMatchRosterLockAt(matchDate);
  if (!preMatch || !attendanceFinal || !rosterLock) return [];

  return [
    {source: 'activeRoster', captureAt: preMatch},
    {source: 'confirmedAvailableRoster', captureAt: attendanceFinal},
    {source: 'matchLineup', captureAt: rosterLock},
  ];
}

/**
 * Returns the one information stage that is valid to capture at `now`.
 * Earlier stages are deliberately not backfilled using later data. Match Lineup
 * also has a finite grace window so a delayed job cannot silently preserve a
 * later CI state as though it were the roster-lock prediction.
 */
export function predictionCaptureEligibility(
  matchDate: string,
  now = new Date(),
): PredictionCaptureEligibility {
  const checkpoints = predictionCaptureCheckpoints(matchDate);
  if (checkpoints.length !== 3) return {eligible: false, reason: 'NotDue'};

  const [preMatch, attendanceFinal, rosterLock] = checkpoints;
  const timestamp = now.getTime();

  if (timestamp < preMatch.captureAt.getTime()) {
    return {eligible: false, reason: 'NotDue'};
  }

  if (timestamp < attendanceFinal.captureAt.getTime()) {
    return {eligible: true, source: 'activeRoster'};
  }

  if (timestamp < rosterLock.captureAt.getTime()) {
    return {eligible: true, source: 'confirmedAvailableRoster'};
  }

  if (timestamp < rosterLock.captureAt.getTime() + MATCH_LINEUP_CAPTURE_GRACE_MS) {
    return {eligible: true, source: 'matchLineup'};
  }

  return {eligible: false, reason: 'Expired'};
}

export function currentPredictionCaptureSource(
  matchDate: string,
  now = new Date(),
): TeamStrengthSource | undefined {
  const eligibility = predictionCaptureEligibility(matchDate, now);
  return eligibility.eligible ? eligibility.source : undefined;
}

export function captureAtForSource(
  matchDate: string,
  source: TeamStrengthSource,
): Date | undefined {
  return predictionCaptureCheckpoints(matchDate)
    .find((checkpoint) => checkpoint.source === source)
    ?.captureAt;
}
