import type {
  AttendanceActor,
  AttendanceMatch,
  MatchAttendance,
  MatchAttendanceStatus,
  MatchRoundAvailability,
  MatchRoster,
  TeamAttendanceMember,
} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';

export interface MatchRosterRepository {
  getAttendanceActor(userId: string, matchId?: string): Promise<AttendanceActor | undefined>;
  getAttendanceMatch(matchId: string): Promise<AttendanceMatch | undefined>;
  getAttendance(matchId: string, playerId: string): Promise<MatchAttendance | undefined>;
  getTeamAttendance(matchId: string, teamId: string): Promise<TeamAttendanceMember[]>;
  getRoundAvailability(matchId: string, teamIds: string[]): Promise<MatchRoundAvailability[]>;
  getMatchRoster(matchId: string, teamId: string): Promise<MatchRoster | undefined>;
  getOfficialMatchRosters(matchId: string): Promise<OfficialMatchRoster[]>;
  hasCompleteSnapshot(matchId: string): Promise<boolean>;
  getSnapshotCandidateMatches(snapshotStartAt: Date, now: Date): Promise<AttendanceMatch[]>;
  createLockedSnapshot(matchId: string): Promise<void>;
  addSnapshotPlayer(matchId: string, teamId: string, playerId: string): Promise<void>;
  removeSnapshotPlayer(matchId: string, teamId: string, playerId: string): Promise<void>;
  saveAttendance(input: {
    matchId: string;
    teamId: string;
    playerId: string;
    status: MatchAttendanceStatus;
    updatedBy: string;
  }): Promise<MatchAttendance>;
  saveMatchRoster(input: {
    matchId: string;
    teamId: string;
    confirmedBy: string;
    confirmedAt: string;
  }): Promise<MatchRoster>;
}
