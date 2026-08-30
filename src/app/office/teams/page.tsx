import {OfficePage} from '@/components/commissioner/OfficePage';
import {OfficeTeamCommandCenter} from '@/components/teams/OfficeTeamCommandCenter';
import {
  rankTeamStrengths,
  type OfficeAttendanceCounts,
  type OfficeRosterPlayer,
  type OfficeScheduledMatch,
  type OfficeTeamCommandCenterData,
  type OfficeTeamDashboard,
  type OfficeTeamNextMatch,
} from '@/components/teams/officeTeamDashboard';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import type {Course} from '@/domain/course/Course';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {PublicScheduleEvent} from '@/domain/schedule/ScheduleService';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import type {Team} from '@/models/Team';
import {
  calculateConfirmedAvailableRosterStrength,
  calculateRosterStageStrength,
} from '@/services/teamStrength/RosterStrength';

export const dynamic = 'force-dynamic';

type ActiveSeasonRow = {
  id: string;
  name: string;
};

type MembershipRow = {
  player_id: string;
  team_id: string;
};

type AttendanceRow = {
  match_id: string;
  team_id: string;
  player_id: string;
  status: 'Playing' | 'NotPlaying';
};

type TeamDraft = Omit<OfficeTeamDashboard, 'strengthRank'>;

export default async function OfficeTeamsPage() {
  if (!hasSupabaseConfig()) {
    return officeMessage('Supabase is not configured for the team command center.');
  }

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) {
    return officeMessage('Sign in from the public Account page before opening team control.');
  }

  const repository = new SupabaseLaunchRepository(supabase);
  const commissionerProfile = await repository.getProfileByUserId(user.id);
  if (commissionerProfile?.role !== 'Commissioner' || commissionerProfile.status !== 'Approved') {
    return officeMessage('Approved commissioner access is required.');
  }

  const launchSupabase = supabase as any;
  const scheduleService = await createServerScheduleService();
  const [players, launchTeams, profiles, activeSeasonResult] = await Promise.all([
    repository.getPlayers(),
    repository.getTeams(),
    repository.getProfiles(),
    launchSupabase
      .from('launch_seasons')
      .select('id, name')
      .eq('active', true)
      .eq('published', true)
      .eq('archived', false)
      .order('year', {ascending: false})
      .limit(1)
      .maybeSingle(),
  ]);

  const activeSeason = activeSeasonResult.data as ActiveSeasonRow | null;
  let rosterError: string | undefined;
  if (activeSeasonResult.error) {
    console.error('Office team dashboard could not load the active season.', activeSeasonResult.error);
    rosterError = 'The active season could not be loaded.';
  } else if (!activeSeason) {
    rosterError = 'No active published season is available for roster membership.';
  }

  let membershipRows: MembershipRow[] = [];
  if (activeSeason) {
    const membershipResult = await launchSupabase
      .from('launch_season_roster_memberships')
      .select('player_id, team_id')
      .eq('season_id', activeSeason.id)
      .eq('status', 'Active');
    if (membershipResult.error) {
      console.error('Office team dashboard could not load active-season rosters.', membershipResult.error);
      rosterError = 'Active-season rosters could not be loaded.';
    } else {
      membershipRows = (membershipResult.data ?? []) as MembershipRow[];
    }
  }

  let scheduleTeams: Team[] = [];
  let courses: Course[] = [];
  let publishedEvents: PublicScheduleEvent[] = [];
  try {
    [scheduleTeams, courses, publishedEvents] = await Promise.all([
      scheduleService.getTeams(),
      scheduleService.getCourses(),
      scheduleService.getPublishedEvents(new Date()),
    ]);
  } catch (error) {
    console.error('Office team dashboard could not load schedule context.', error);
  }

  const activeLaunchTeams = launchTeams.filter((team) => team.active);
  const activeTeamIds = new Set(activeLaunchTeams.map((team) => team.id));
  const upcomingEvents = publishedEvents.filter((event) =>
    event.bucket === 'upcoming'
    && activeTeamIds.has(event.homeTeamId)
    && activeTeamIds.has(event.awayTeamId));
  const matchRecords = await Promise.all(upcomingEvents.map(async (event) => {
    try {
      return await scheduleService.getMatch(event.id);
    } catch (error) {
      console.error('Office team dashboard could not load a scheduled match.', {matchId: event.id, error});
      return undefined;
    }
  }));
  const courseById = new Map(courses.map((course) => [course.id, course]));

  const scheduledMatches: OfficeScheduledMatch[] = upcomingEvents.map((event, index) => {
    const match = matchRecords[index];
    const course = match?.courseId ? courseById.get(match.courseId) : undefined;
    return {
      id: event.id,
      date: event.date,
      time: event.time,
      course: event.course,
      homeTeamId: event.homeTeamId,
      homeTeamName: event.home,
      awayTeamId: event.awayTeamId,
      awayTeamName: event.away,
      homeAdvantageApplies: course?.homeTeamId === event.homeTeamId,
    };
  });

  const nextMatchByTeamId = new Map<string, OfficeTeamNextMatch>();
  for (const match of scheduledMatches) {
    if (!nextMatchByTeamId.has(match.homeTeamId)) {
      nextMatchByTeamId.set(match.homeTeamId, {
        id: match.id,
        date: match.date,
        time: match.time,
        course: match.course,
        opponentId: match.awayTeamId,
        opponentName: match.awayTeamName,
        isHome: true,
        homeAdvantageApplies: match.homeAdvantageApplies,
      });
    }
    if (!nextMatchByTeamId.has(match.awayTeamId)) {
      nextMatchByTeamId.set(match.awayTeamId, {
        id: match.id,
        date: match.date,
        time: match.time,
        course: match.course,
        opponentId: match.homeTeamId,
        opponentName: match.homeTeamName,
        isHome: false,
        homeAdvantageApplies: match.homeAdvantageApplies,
      });
    }
  }

  const nextMatchIds = [...new Set([...nextMatchByTeamId.values()].map((match) => match.id))];
  let attendanceRows: AttendanceRow[] = [];
  let attendanceQueryFailed = false;
  if (nextMatchIds.length) {
    const attendanceResult = await launchSupabase
      .from('launch_match_attendance')
      .select('match_id, team_id, player_id, status')
      .in('match_id', nextMatchIds);
    if (attendanceResult.error) {
      attendanceQueryFailed = true;
      console.error('Office team dashboard could not load match attendance.', attendanceResult.error);
    } else {
      attendanceRows = (attendanceResult.data ?? []) as AttendanceRow[];
    }
  }

  const explicitAttendance = new Map(attendanceRows.map((row) => [
    attendanceKey(row.match_id, row.team_id, row.player_id),
    row.status,
  ]));
  const membershipsByTeam = new Map<string, string[]>();
  for (const membership of membershipRows) {
    if (!activeTeamIds.has(membership.team_id)) continue;
    const ids = membershipsByTeam.get(membership.team_id) ?? [];
    if (!ids.includes(membership.player_id)) ids.push(membership.player_id);
    membershipsByTeam.set(membership.team_id, ids);
  }

  const playersById = new Map(players.map((player) => [player.id, player]));
  const scheduleTeamsById = new Map(scheduleTeams.map((team) => [team.id, team]));
  const captainByTeamId = new Map<string, string>();
  for (const profile of profiles) {
    if (
      profile.role === 'Captain'
      && profile.status === 'Approved'
      && profile.captainTeamId
      && !captainByTeamId.has(profile.captainTeamId)
    ) {
      captainByTeamId.set(profile.captainTeamId, profile.displayName);
    }
  }

  const teamDrafts: TeamDraft[] = activeLaunchTeams.map((team) => {
    const playerIds = membershipsByTeam.get(team.id) ?? [];
    const rosterPlayers = playerIds
      .map((playerId) => playersById.get(playerId))
      .filter((player): player is NonNullable<typeof player> => Boolean(player));
    const activeStrength = calculateRosterStageStrength('activeRoster', rosterPlayers, playerIds) ?? null;
    const strengthCiByPlayerId = new Map(
      activeStrength?.playerClashIndexes.map((entry) => [entry.playerId, entry.clashIndex]) ?? [],
    );
    const nextMatch = nextMatchByTeamId.get(team.id) ?? null;
    const attendanceAvailable = Boolean(nextMatch) && !attendanceQueryFailed;
    const attendanceMembers = nextMatch && attendanceAvailable
      ? playerIds.map((playerId) => ({
          playerId,
          playerName: playersById.get(playerId)?.name ?? `Missing player ${playerId.slice(0, 6)}`,
          teamId: team.id,
          status: explicitAttendance.get(attendanceKey(nextMatch.id, team.id, playerId)) ?? 'Unconfirmed' as const,
        }))
      : [];
    const currentAttendanceStrength = attendanceMembers.length
      ? calculateConfirmedAvailableRosterStrength(rosterPlayers, attendanceMembers) ?? null
      : null;

    const roster: OfficeRosterPlayer[] = playerIds.map((playerId) => {
      const player = playersById.get(playerId);
      const attendanceStatus = nextMatch && attendanceAvailable
        ? explicitAttendance.get(attendanceKey(nextMatch.id, team.id, playerId)) ?? 'Unconfirmed'
        : null;
      return {
        id: playerId,
        name: player?.name ?? `Missing player ${playerId.slice(0, 6)}`,
        gender: player?.gender ?? 'Unknown',
        pdgaNumber: player?.pdgaNumber ?? '',
        pdgaRating: player?.pdgaRating ?? null,
        strengthCi: strengthCiByPlayerId.get(playerId) ?? null,
        strengthCiProvisional: !player || !isPositiveNumber(player.clashIndex) || player.clashIndexProvisional === true,
        attendanceStatus,
      };
    });

    const attendanceCounts: OfficeAttendanceCounts | null = nextMatch && attendanceAvailable
      ? {
          playing: roster.filter((player) => player.attendanceStatus === 'Playing').length,
          unconfirmed: roster.filter((player) => player.attendanceStatus === 'Unconfirmed').length,
          notPlaying: roster.filter((player) => player.attendanceStatus === 'NotPlaying').length,
        }
      : null;
    const scheduleTeam = scheduleTeamsById.get(team.id);

    return {
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      captain: scheduleTeam?.captain || captainByTeamId.get(team.id) || '',
      homeCourse: scheduleTeam?.homeCourse || '',
      rosterCount: playerIds.length,
      womenCount: activeStrength?.femalePlayerCount
        ?? roster.filter((player) => player.gender === 'Female').length,
      activeStrength,
      currentAttendanceStrength,
      nextMatch,
      attendanceAvailable,
      attendanceCounts,
      players: roster,
    };
  });

  const strengthRanks = rankTeamStrengths(teamDrafts.map((team) => ({
    id: team.id,
    strength: team.activeStrength?.baseStrength,
  })));
  const teams: OfficeTeamDashboard[] = teamDrafts
    .map((team) => ({...team, strengthRank: strengthRanks[team.id] ?? null}))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, {sensitivity: 'base'}));
  const rosteredPlayerCount = new Set(
    membershipRows
      .filter((membership) => activeTeamIds.has(membership.team_id))
      .map((membership) => membership.player_id),
  ).size;

  const data: OfficeTeamCommandCenterData = {
    seasonName: activeSeason?.name ?? 'No active season',
    rosteredPlayerCount,
    rosterError,
    teams,
    scheduledMatches,
  };

  return (
    <OfficePage sectionId="teams">
      <OfficeTeamCommandCenter data={data} />
    </OfficePage>
  );
}

function attendanceKey(matchId: string, teamId: string, playerId: string): string {
  return `${matchId}:${teamId}:${playerId}`;
}

function isPositiveNumber(value: number | null | undefined): value is number {
  return Number.isFinite(value) && (value ?? 0) > 0;
}

function officeMessage(message: string) {
  return (
    <OfficePage sectionId="teams">
      <section className="office-module-frame">
        <span>Team command center</span>
        <h2>Roster dashboard unavailable</h2>
        <p>{message}</p>
      </section>
    </OfficePage>
  );
}
