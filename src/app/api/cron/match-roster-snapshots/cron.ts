import type {SnapshotCronSummary} from '@/domain/match-roster/MatchRosterSnapshot';
import {parseMatchRosterSnapshotStartAt} from '@/domain/match-roster/MatchRosterSnapshotAutomation';

export type SnapshotCronRunner = {
  processLockedSnapshots(snapshotStartAt?: Date): Promise<SnapshotCronSummary>;
};

export function isCronRequestAuthorized(authorization: string | null, secret: string | undefined): boolean {
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

export function runSnapshotCron(runner: SnapshotCronRunner): Promise<SnapshotCronSummary> {
  return runner.processLockedSnapshots(parseMatchRosterSnapshotStartAt(process.env.MATCH_ROSTER_SNAPSHOT_START_AT));
}
