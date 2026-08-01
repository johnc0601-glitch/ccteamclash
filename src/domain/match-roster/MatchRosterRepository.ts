import type {
  AttendanceActor,
  AttendanceMatch,
  MatchAttendance,
  MatchAttendanceStatus,
} from '@/domain/match-roster/MatchAttendance';

export interface MatchRosterRepository {
  getAttendanceActor(userId: string): Promise<AttendanceActor | undefined>;
  getAttendanceMatch(matchId: string): Promise<AttendanceMatch | undefined>;
  getAttendance(matchId: string, playerId: string): Promise<MatchAttendance | undefined>;
  saveAttendance(input: {
    matchId: string;
    teamId: string;
    playerId: string;
    status: MatchAttendanceStatus;
    updatedBy: string;
  }): Promise<MatchAttendance>;
}
