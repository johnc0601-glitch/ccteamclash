import type {Course} from '@/domain/course/Course';
import type {LaunchPlayer, LaunchTeam} from '@/domain/launch/LaunchData';
import type {MatchResult} from '@/domain/results/MatchResult';
import type {Match, MatchStatus} from '@/domain/schedule/Match';
import type {PublicScheduleEvent} from '@/domain/schedule/ScheduleService';

export type MatchdayLifecycle = 'Scheduled' | 'Completed' | 'Postponed' | 'Cancelled' | 'Rain Delay';

export type PublicMatchdayTeam = {
  id: string;
  team: LaunchTeam | undefined;
  name: string;
  logo: string;
  roster: LaunchPlayer[];
};

export type PublicMatchday = PublicScheduleEvent & {
  lifecycle: MatchdayLifecycle;
  courseDetails: Course | undefined;
  homeTeam: PublicMatchdayTeam;
  awayTeam: PublicMatchdayTeam;
};

export type MatchdayScoreboard = {
  heading: string;
  detail: string;
};

export type MatchdayRosterPlayerIds = ReadonlyMap<string, ReadonlySet<string>>;

export function resolveMatchday(
  event: PublicScheduleEvent,
  match: Match,
  teams: LaunchTeam[],
  players: LaunchPlayer[],
  courses: Course[],
  hasPublishedResult: boolean,
  rosterPlayerIdsByTeam: MatchdayRosterPlayerIds,
): PublicMatchday | undefined {
  if (
    event.id !== match.id
    || !match.homeTeamId
    || !match.awayTeamId
    || !match.courseId
  ) {
    return undefined;
  }

  return {
    ...event,
    lifecycle: resolveMatchdayLifecycle(match.status, hasPublishedResult),
    courseDetails: courses.find((course) => course.id === match.courseId),
    homeTeam: resolveTeam(
      match.homeTeamId,
      teams,
      players,
      rosterPlayerIdsByTeam.get(match.homeTeamId) ?? new Set<string>(),
    ),
    awayTeam: resolveTeam(
      match.awayTeamId,
      teams,
      players,
      rosterPlayerIdsByTeam.get(match.awayTeamId) ?? new Set<string>(),
    ),
  };
}

export function resolveMatchdayLifecycle(
  status: MatchStatus,
  hasPublishedResult: boolean,
): MatchdayLifecycle {
  if (hasPublishedResult) return 'Completed';
  if (status === 'Postponed' || status === 'Cancelled' || status === 'Rain Delay') return status;
  return 'Scheduled';
}

export function getCaptainMatchIds(
  events: PublicScheduleEvent[],
  teamId: string,
): string[] {
  return events
    .filter((event) => event.homeTeamId === teamId || event.awayTeamId === teamId)
    .map((event) => event.id);
}

export function resolveMatchdayScoreboard(
  matchday: Pick<PublicMatchday, 'awayTeam' | 'homeTeam'>,
  result: MatchResult | undefined,
): MatchdayScoreboard {
  if (!result) {
    return {
      heading: 'Scoreboard pending',
      detail: 'Official results will appear after commissioner review.',
    };
  }

  return {
    heading: `${result.awayScore} – ${result.homeScore}`,
    detail: `${matchday.awayTeam.name} at ${matchday.homeTeam.name} · Final`,
  };
}

function resolveTeam(
  teamId: string,
  teams: LaunchTeam[],
  players: LaunchPlayer[],
  rosterPlayerIds: ReadonlySet<string>,
): PublicMatchdayTeam {
  const team = teams.find((candidate) => candidate.id === teamId);
  const roster = players
    .filter((player) => player.active && rosterPlayerIds.has(player.id))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, {sensitivity: 'base'}));

  return {
    id: teamId,
    team,
    name: team?.name ?? 'Team unavailable',
    logo: team?.logo ?? '',
    roster,
  };
}
