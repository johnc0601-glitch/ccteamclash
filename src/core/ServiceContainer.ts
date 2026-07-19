import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {CourseService} from '@/domain/course/CourseService';
import {MockHistoricalImportRepository} from '@/domain/history/HistoricalImportRepository';
import {HistoricalImportService} from '@/domain/history/HistoricalImportService';
import {MockImportRepository} from '@/domain/import/ImportRepository';
import {ImportService} from '@/domain/import/ImportService';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import {ScheduleService} from '@/domain/schedule/ScheduleService';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {MockPlayerRepository} from '@/repositories/PlayerRepository';
import {PlayerService} from '@/services/PlayerService';
import {PublicPlayerService} from '@/services/public/PublicPlayerService';
import {TeamService} from '@/services/TeamService';
import {RankingsService} from '@/services/rankings';
import {StandingsService} from '@/services/standings';
import {MockStatisticsRepository, StatisticsEngine} from '@/services/statistics';

const repositories = {
  teams: new MockTeamRepository(),
  players: new MockPlayerRepository(),
  seasons: new MockSeasonRepository(),
  schedules: new MockScheduleRepository(),
  courses: new MockCourseRepository(),
  historicalImports: new MockHistoricalImportRepository(),
  imports: new MockImportRepository(),
  statistics: new MockStatisticsRepository(),
};

const teams = new TeamService(repositories.teams);
const players = new PlayerService(repositories.players, teams);
const seasons = new SeasonService(repositories.seasons);
const courses = new CourseService(repositories.courses);
const schedules = new ScheduleService(
  repositories.schedules,
  seasons,
  teams,
  repositories.courses,
);
const statistics = new StatisticsEngine(repositories.statistics);
const rankings = new RankingsService(players, statistics);
const publicPlayers = new PublicPlayerService(players, teams, seasons, statistics);

export const services = {
  teams,
  players,
  seasons,
  courses,
  historicalImports: new HistoricalImportService(repositories.historicalImports),
  schedules,
  imports: new ImportService(
    repositories.imports,
    seasons,
    teams,
    schedules,
  ),
  statistics,
  rankings,
  publicPlayers,
  standings: new StandingsService(teams, statistics),
};
