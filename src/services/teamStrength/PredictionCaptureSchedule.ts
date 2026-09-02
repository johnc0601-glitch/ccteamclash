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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fixed regular-season Team Strength checkpoints.
 *
 * PreMatch is captured when match-week attendance opens (Friday 12:00 AM ET),
 * before availability data begins to replace the active-roster view.
 * AttendanceFinal is captured at the player response lock (Friday 12:00 PM ET).
 * MatchLineup is captured at the official roster lock (Friday 3:00 PM ET).
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
 * Earlier stages are deliberately not backfilled using later data: a missed
 * snapshot remains missing rather than being mislabeled with a player pool or
 * CI values observed after its checkpoint window. The final lineup window ends
 * at the close of Friday ET, after the scheduled evening capture has run.
 */
export function currentPredictionCaptureSource(
  matchDate: string,
  now = new Date(),
): TeamStrengthSource | undefined {
  const checkpoints = predictionCaptureCheckpoints(matchDate);
  if (checkpoints.length !== 3) return undefined;

  const [preMatch, attendanceFinal, rosterLock] = checkpoints;
  const timestamp = now.getTime();
  const lineupCaptureEndsAt = preMatch.captureAt.getTime() + DAY_MS;

  if (
    timestamp >= preMatch.captureAt.getTime()
    && timestamp < attendanceFinal.captureAt.getTime()
  ) return 'activeRoster';

  if (
    timestamp >= attendanceFinal.captureAt.getTime()
    && timestamp < rosterLock.captureAt.getTime()
  ) return 'confirmedAvailableRoster';

  if (
    timestamp >= rosterLock.captureAt.getTime()
    && timestamp < lineupCaptureEndsAt
  ) return 'matchLineup';

  return undefined;
}

export function captureAtForSource(
  matchDate: string,
  source: TeamStrengthSource,
): Date | undefined {
  return predictionCaptureCheckpoints(matchDate)
    .find((checkpoint) => checkpoint.source === source)
    ?.captureAt;
}
