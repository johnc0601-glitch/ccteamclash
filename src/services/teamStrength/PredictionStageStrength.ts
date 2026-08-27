import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';
import {
  calculateActiveRosterStrengthFromPlayers,
  calculateConfirmedAvailableRosterStrength,
  calculateMatchLineupStrength,
  type RosterStrengthResult,
  type TeamStrengthSource,
} from './RosterStrength';

export type MatchStageStrengthPair = {
  source: TeamStrengthSource;
  home: RosterStrengthResult;
  away: RosterStrengthResult;
};

/**
 * Resolves both teams from the same information stage. Callers provide the
 * exact season-roster player sets rather than deriving membership from a
 * player's current team, which keeps historical capture semantics explicit.
 */
export function calculateMatchStageStrengthPair(input: {
  source: TeamStrengthSource;
  homeTeamId: string;
  awayTeamId: string;
  homePlayers: readonly LaunchPlayer[];
  awayPlayers: readonly LaunchPlayer[];
  homeAttendance?: readonly TeamAttendanceMember[];
  awayAttendance?: readonly TeamAttendanceMember[];
  officialRosters?: readonly OfficialMatchRoster[];
}): MatchStageStrengthPair | undefined {
  const {source} = input;

  if (source === 'activeRoster') {
    const home = calculateActiveRosterStrengthFromPlayers(input.homePlayers);
    const away = calculateActiveRosterStrengthFromPlayers(input.awayPlayers);
    return home && away ? {source, home, away} : undefined;
  }

  if (source === 'confirmedAvailableRoster') {
    if (!input.homeAttendance || !input.awayAttendance) return undefined;
    const home = calculateConfirmedAvailableRosterStrength(
      input.homePlayers,
      input.homeAttendance,
    );
    const away = calculateConfirmedAvailableRosterStrength(
      input.awayPlayers,
      input.awayAttendance,
    );
    return home && away ? {source, home, away} : undefined;
  }

  if (!input.officialRosters) return undefined;
  const homeRoster = input.officialRosters.find((roster) => roster.teamId === input.homeTeamId);
  const awayRoster = input.officialRosters.find((roster) => roster.teamId === input.awayTeamId);
  if (!homeRoster || !awayRoster) return undefined;

  const home = calculateMatchLineupStrength(input.homePlayers, homeRoster);
  const away = calculateMatchLineupStrength(input.awayPlayers, awayRoster);
  return home && away ? {source, home, away} : undefined;
}
