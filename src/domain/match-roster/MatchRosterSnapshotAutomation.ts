import type {AttendanceMatch} from '@/domain/match-roster/MatchAttendance';
import {getMatchRosterLockAt} from '@/domain/match-roster/MatchRosterLock';

const ISO_TIMESTAMP_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export type SnapshotLogContext = {
  operation: 'configuration' | 'lazy-create' | 'scheduled-create' | 'cron';
  matchId?: string;
  errorClass?: string;
};

export function parseMatchRosterSnapshotStartAt(value: string | undefined): Date | undefined {
  if (!value || !ISO_TIMESTAMP_WITH_ZONE.test(value)) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function isMatchAtOrAfterSnapshotCutoff(match: AttendanceMatch, cutoff: Date): boolean {
  if (!match.date) return false;
  const lockAt = getMatchRosterLockAt(match.date);
  return Boolean(lockAt && lockAt.getTime() >= cutoff.getTime());
}

export function snapshotErrorClass(error: unknown): string {
  return error instanceof Error && error.name ? error.name : 'UnknownError';
}
