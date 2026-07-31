import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import {PLAYER_MOCK_DATA} from '@/data/players';
import {TEAM_MOCK_DATA} from '@/data/teams';
import type {LaunchEvent, LaunchPlayer, LaunchSeedData, LaunchTeam} from '@/domain/launch/LaunchData';

const EMPTY_LAUNCH_TABLES = {
  profiles: [],
  playerClaims: [],
  eventRosters: [],
  eventRosterPlayers: [],
  eventPosts: [],
};

export async function buildLaunchSeedData(): Promise<LaunchSeedData> {
  const courses = await new MockCourseRepository().getAll();
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const scheduleRepository = new MockScheduleRepository();
  const schedules = await scheduleRepository.getSchedules();
  const scheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const rounds = await scheduleRepository.getRounds();
  const roundById = new Map(rounds.map((round) => [round.id, round]));
  const matches = await scheduleRepository.getMatches();

  return {
    ...EMPTY_LAUNCH_TABLES,
    teams: TEAM_MOCK_DATA.map(toLaunchTeam),
    players: PLAYER_MOCK_DATA.map(toLaunchPlayer),
    events: matches.filter((match): match is typeof match & {
      homeTeamId: string;
      awayTeamId: string;
      courseId: string;
      date: string;
    } => Boolean(match.homeTeamId && match.awayTeamId && match.courseId && match.date)).map((match): LaunchEvent => {
      const round = roundById.get(match.roundId);
      const schedule = round ? scheduleById.get(round.scheduleId) : undefined;
      const course = courseById.get(match.courseId);

      return {
        id: match.id,
        seasonLabel: schedule?.name ?? match.seasonId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        courseName: course?.name ?? match.courseId,
        directionsUrl: course?.mapUrl ?? '',
        date: match.date ?? '',
        time: match.time ?? '',
        status: match.status === 'Completed' ? 'Final' : match.status === 'Cancelled' ? 'Cancelled' : 'Scheduled',
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
      };
    }),
  };
}

function toLaunchTeam(team: (typeof TEAM_MOCK_DATA)[number]): LaunchTeam {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    logo: team.logo,
    active: team.active,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

function toLaunchPlayer(player: (typeof PLAYER_MOCK_DATA)[number]): LaunchPlayer {
  return {
    id: player.id,
    name: player.name,
    gender: player.gender,
    pdgaNumber: player.pdgaNumber,
    pdgaRating: player.pdgaRating,
    currentTeamId: player.teamId || null,
    homeArea: '',
    active: player.active,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };
}
