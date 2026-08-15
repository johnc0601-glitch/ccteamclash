import type {Course} from '@/domain/course/Course';
import type {LaunchPlayer, LaunchProfile, LaunchTeam} from '@/domain/launch/LaunchData';
import type {LaunchProfileState} from '@/domain/launch/LaunchProfileState';
import type {MatchResult} from '@/domain/results/MatchResult';
import type {Match, MatchStatus} from '@/domain/schedule/Match';
import type {PublicScheduleEvent} from '@/domain/schedule/ScheduleService';
import type {SeasonRosterMembership} from '@/domain/season-roster/SeasonRosterMembership';

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

export function resolveMatchday(
  event: PublicScheduleEvent,
  match: Match,
  teams: LaunchTeam[],
  players: LaunchPlayer[],
  memberships: SeasonRosterMembership[],
  courses: Course[],
  hasPublishedResult: boolean,
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
    homeTeam: resolveTeam(match.homeTeamId, match.seasonId, teams, players, memberships),
    awayTeam: resolveTeam(match.awayTeamId, match.seasonId, teams, players, memberships),
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

export function resolveAttendanceUnavailableMessage(input: {
  signedIn: boolean;
  state: LaunchProfileState;
  profile: LaunchProfile | undefined;
  player: LaunchPlayer | undefined;
  membership: SeasonRosterMembership | undefined;
  homeTeamId: string;
  awayTeamId: string;
}): string {
  const {signedIn, state, profile, player, membership, homeTeamId, awayTeamId} = input;
  if (!signedIn) return 'Sign in and complete your player profile to submit match availability.';
  if (state === 'missing') return 'No league profile is connected to your account. Complete account setup to submit match availability.';
  if (state.startsWith('pending_')) return 'Your profile is pending approval. Attendance will be available after your player profile is approved and assigned.';
  if (state === 'rejected') return 'Your profile is not approved for match attendance. Visit your account for status details.';
  if (state === 'suspended') return 'Your profile is suspended, so match attendance is unavailable.';
  if (state !== 'approved_player') return 'Personal attendance is available only through an approved player profile.';
  if (!profile?.playerId) return 'Your player profile is approved but is not linked to a player record.';
  if (!player) return 'Your linked player record is unavailable. Contact a league administrator.';
  if (!player.active) return 'Your linked player record is inactive, so attendance is unavailable.';
  if (!membership) return 'You are not on an active season roster for this match.';
  if (membership.status === 'Dropped') {
    return 'You were dropped from this season roster, so match attendance is unavailable.';
  }
  if (membership.teamId !== homeTeamId && membership.teamId !== awayTeamId) {
    return 'Your season roster team is not participating in this match.';
  }
  return 'Attendance is unavailable for this match. Refresh the page or contact a league administrator.';
}

function resolveTeam(
  teamId: string,
  seasonId: string,
  teams: LaunchTeam[],
  players: LaunchPlayer[],
  memberships: SeasonRosterMembership[],
): PublicMatchdayTeam {
  const team = teams.find((candidate) => candidate.id === teamId);
  const activePlayerIds = new Set(memberships
    .filter((membership) => (
      membership.seasonId === seasonId
      && membership.teamId === teamId
      && membership.status === 'Active'
    ))
    .map((membership) => membership.playerId));
  const roster = players
    .filter((player) => player.active && activePlayerIds.has(player.id))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, {sensitivity: 'base'}));

  return {
    id: teamId,
    team,
    name: team?.name ?? 'Team unavailable',
    logo: team?.logo ?? '',
    roster,
  };
}
