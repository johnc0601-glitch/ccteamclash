import type {MatchStatus} from '@/domain/schedule/Match';

export const MATCH_ATTENDANCE_STATUSES = ['Playing', 'NotPlaying'] as const;

export type MatchAttendanceStatus = (typeof MATCH_ATTENDANCE_STATUSES)[number];

export type MatchAttendance = {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  status: MatchAttendanceStatus;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceActor = {
  profileId: string;
  profileStatus: 'Pending' | 'Approved' | 'Suspended' | 'Rejected';
  profileRole: 'Player' | 'Captain' | 'Commissioner';
  playerId: string | null;
  teamId: string | null;
  captainTeamId: string | null;
  playerName: string | null;
  playerActive: boolean;
};

export type TeamAttendanceMember = {
  playerId: string;
  playerName: string;
  teamId: string;
  status: MatchAttendanceStatus | 'Unconfirmed';
};

export type MatchRosterStatus = 'Draft' | 'Confirmed';

export type MatchRoster = {
  id: string;
  matchId: string;
  teamId: string;
  status: MatchRosterStatus;
  confirmedBy: string | null;
  confirmedAt: string | null;
  updatedAt: string;
};

export type ManagedTeamRoster = {
  matchId: string;
  teamId: string;
  attendanceOpen: boolean;
  emailReminderOpen?: boolean;
  rosterStatus: MatchRosterStatus;
  confirmedAt: string | null;
  players: TeamAttendanceMember[];
};

export type AttendanceMatch = {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  date: string | null;
  status: MatchStatus;
};

export type PersonalAttendance = {
  matchId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  status: MatchAttendanceStatus | 'Unconfirmed';
  attendanceOpen: boolean;
};

export type AttendanceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string};
