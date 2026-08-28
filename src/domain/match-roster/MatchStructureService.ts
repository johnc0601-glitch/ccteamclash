import type {OfficialMatchRoster} from './MatchRosterSnapshot';
import {
  buildLockedMatchStructure,
  type LockedMatchStructure,
  type MatchStructureDoublesSlot,
  type MatchStructureSinglesSlot,
} from './MatchStructureLock';
import type {MatchStructureRepository} from './MatchStructureRepository';

export type LockMatchStructureResult =
  | {ok: true; data: LockedMatchStructure}
  | {ok: false; message: string; errors: string[]};

export class MatchStructureService {
  constructor(private readonly repository: MatchStructureRepository) {}

  getLocked(matchId: string): Promise<LockedMatchStructure | undefined> {
    return this.repository.getLocked(matchId);
  }

  async lock(input: {
    matchId: string;
    homeTeamId: string;
    awayTeamId: string;
    singles?: readonly MatchStructureSinglesSlot[];
    doubles?: readonly MatchStructureDoublesSlot[];
    officialRosters: readonly OfficialMatchRoster[];
    lockedBy: string;
    lockedAt?: string;
  }): Promise<LockMatchStructureResult> {
    const built = buildLockedMatchStructure(input);
    if (!built.ok) {
      return {
        ok: false,
        message: 'Review the match structure before locking.',
        errors: built.errors,
      };
    }

    await this.repository.saveLocked(built.data);
    return {ok: true, data: built.data};
  }
}
