import type {RosterStrengthResult} from '@/services/teamStrength/RosterStrength';

export type OfficeAttendanceStatus = 'Playing' | 'Unconfirmed' | 'NotPlaying' | null;

export type OfficeRosterPlayer = {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Unknown';
  pdgaNumber: string;
  pdgaRating: number | null;
  strengthCi: number | null;
  strengthCiProvisional: boolean;
  attendanceStatus: OfficeAttendanceStatus;
};

export type OfficeAttendanceCounts = {
  playing: number;
  unconfirmed: number;
  notPlaying: number;
};

export type OfficeTeamNextMatch = {
  id: string;
  date: string;
  time: string;
  course: string;
  opponentId: string;
  opponentName: string;
  isHome: boolean;
  homeAdvantageApplies: boolean;
};

export type OfficeTeamDashboard = {
  id: string;
  name: string;
  shortName: string;
  captain: string;
  homeCourse: string;
  rosterCount: number;
  womenCount: number;
  strengthRank: number | null;
  activeStrength: RosterStrengthResult | null;
  currentAttendanceStrength: RosterStrengthResult | null;
  nextMatch: OfficeTeamNextMatch | null;
  attendanceAvailable: boolean;
  attendanceCounts: OfficeAttendanceCounts | null;
  players: OfficeRosterPlayer[];
};

export type OfficeScheduledMatch = {
  id: string;
  date: string;
  time: string;
  course: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeAdvantageApplies: boolean;
};

export type OfficeTeamCommandCenterData = {
  seasonName: string;
  rosteredPlayerCount: number;
  rosterError?: string;
  teams: OfficeTeamDashboard[];
  scheduledMatches: OfficeScheduledMatch[];
};

type SortableRosterPlayer = Pick<OfficeRosterPlayer, 'name' | 'strengthCi' | 'attendanceStatus'>;

type RankedTeam = {
  id: string;
  strength: number | null | undefined;
};

const ATTENDANCE_ORDER: Record<Exclude<OfficeAttendanceStatus, null>, number> = {
  Playing: 0,
  Unconfirmed: 1,
  NotPlaying: 2,
};

export function sortOfficeRosterPlayers<T extends SortableRosterPlayer>(
  players: readonly T[],
  useAttendance: boolean,
): T[] {
  return [...players].sort((left, right) => {
    if (useAttendance) {
      const leftAttendance = left.attendanceStatus ? ATTENDANCE_ORDER[left.attendanceStatus] : 1;
      const rightAttendance = right.attendanceStatus ? ATTENDANCE_ORDER[right.attendanceStatus] : 1;
      if (leftAttendance !== rightAttendance) return leftAttendance - rightAttendance;
    }

    const leftCi = validCi(left.strengthCi) ? left.strengthCi : Number.NEGATIVE_INFINITY;
    const rightCi = validCi(right.strengthCi) ? right.strengthCi : Number.NEGATIVE_INFINITY;
    if (leftCi !== rightCi) return rightCi - leftCi;

    return left.name.localeCompare(right.name, undefined, {sensitivity: 'base'});
  });
}

export function rankTeamStrengths(teams: readonly RankedTeam[]): Record<string, number> {
  const ranked = teams
    .filter((team): team is RankedTeam & {strength: number} => validCi(team.strength))
    .sort((left, right) => right.strength - left.strength || left.id.localeCompare(right.id));

  return Object.fromEntries(ranked.map((team, index) => [team.id, index + 1]));
}

function validCi(value: number | null | undefined): value is number {
  return Number.isFinite(value) && (value ?? 0) > 0;
}
