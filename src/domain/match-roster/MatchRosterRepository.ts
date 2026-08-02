import type {
  AttendanceActor,
  AttendanceMatch,
  MatchAttendance,
  MatchAttendanceStatus,
  MatchRoster,
  TeamAttendanceMember,
} from '@/domain/match-roster/MatchAttendance';

export interface MatchRosterRepository {
  getAttendanceActor(userId: string): Promise<AttendanceActor | undefined>;
  getAttendanceMatch(matchId: string): Promise<AttendanceMatch | undefined>;
  getAttendance(matchId: string, playerId: string): Promise<MatchAttendance | undefined>;
  getTeamAttendance(matchId: string, teamId: string): Promise<TeamAttendanceMember[]>;
  getMatchRoster(matchId: string, teamId: string): Promise<MatchRoster | undefined>;
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
