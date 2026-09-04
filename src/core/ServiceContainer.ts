import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {CourseService} from '@/domain/course/CourseService';
import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import {MockHistoricalImportRepository} from '@/domain/history/HistoricalImportRepository';
import {HistoricalImportService} from '@/domain/history/HistoricalImportService';
import {MockImportRepository} from '@/domain/import/ImportRepository';
import {ImportService} from '@/domain/import/ImportService';
import {MockLeagueRepository} from '@/domain/league/LeagueRepository';
import {LeagueService} from '@/domain/league/LeagueService';
import {SupabaseLeagueRepository} from '@/domain/league/SupabaseLeagueRepository';
import {MatchLogisticsService} from '@/domain/schedule/MatchLogisticsService';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import {ScheduleService} from '@/domain/schedule/ScheduleService';
import {SupabaseScheduleRepository} from '@/domain/schedule/SupabaseScheduleRepository';
import {MockResultsRepository} from '@/domain/results/ResultsRepository';
import {ResultsService} from '@/domain/results/ResultsService';
import {SupabaseResultsRepository} from '@/domain/results/SupabaseResultsRepository';
import {MockPlayoffRepository} from '@/domain/playoffs/PlayoffRepository';
import {PlayoffService} from '@/domain/playoffs/PlayoffService';
import {SupabasePlayoffRepository} from '@/domain/playoffs/SupabasePlayoffRepository';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {MockPlayerRepository} from '@/repositories/PlayerRepository';
import {PlayerService} from '@/services/PlayerService';
import {PublicPlayerService} from '@/services/public/PublicPlayerService';
import {TeamService} from '@/services/TeamService';
import {RankingsService} from '@/services/rankings';
import {StandingsService} from '@/services/standings';
import {MockStatisticsRepository, StatisticsEngine} from '@/services/statistics';
import {createClient as createBrowserSupabaseClient} from '@/lib/supabase/client';
import {hasSupabaseConfig} from '@/lib/supabase';

const browserSupabase = typeof window !== 'undefined' && hasSupabaseConfig()
  ? createBrowserSupabaseClient()
  : null;

const repositories = {
  teams: new MockTeamRepository(),
  players: new MockPlayerRepository(),
  seasons: browserSupabase
    ? new SupabaseSeasonRepository(browserSupabase)
    : new MockSeasonRepository(),
  schedules: browserSupabase
    ? new SupabaseScheduleRepository(browserSupabase)
    : new MockScheduleRepository(),
  courses: browserSupabase
    ? new SupabaseCourseRepository(browserSupabase)
    : new MockCourseRepository(),
  historicalImports: new MockHistoricalImportRepository(),
  imports: new MockImportRepository(),
  leagues: browserSupabase
    ? new SupabaseLeagueRepository(browserSupabase)
    : new MockLeagueRepository(),
  statistics: new MockStatisticsRepository(),
};

const teams = new TeamService(repositories.teams);
const leagues = new LeagueService(repositories.leagues);
const scheduleTeams = browserSupabase
  ? new TeamService(new SupabaseScheduleTeamRepository(browserSupabase))
  : teams;
const players = new PlayerService(repositories.players, teams);
const seasons = new SeasonService(repositories.seasons);
const courses = new CourseService(repositories.courses);
const schedules = new ScheduleService(
  repositories.schedules,
  seasons,
  scheduleTeams,
  repositories.courses,
);
const matchLogistics = new MatchLogisticsService(
  repositories.schedules,
  seasons,
  repositories.courses,
);

schedules.updateMatch = (id, input) => matchLogistics.update(id, {
  courseId: input.courseId,
  date: input.date,
  time: input.time,
  status: input.status,
  notes: input.notes,
});

const results = new ResultsService(
  browserSupabase
    ? new SupabaseResultsRepository(browserSupabase)
    : new MockResultsRepository(),
  repositories.schedules,
);
const statistics = new StatisticsEngine(repositories.statistics);
const rankings = new RankingsService(players, statistics);
const publicPlayers = new PublicPlayerService(players, teams, seasons, statistics);
const standings = new StandingsService(scheduleTeams, results, schedules, seasons);
const playoffs = new PlayoffService(
  browserSupabase
    ? new SupabasePlayoffRepository(browserSupabase)
    : new MockPlayoffRepository(),
  standings,
  schedules,
  results,
  scheduleTeams,
);

export const services = {
  leagues,
  teams,
  players,
  seasons,
  courses,
  historicalImports: new HistoricalImportService(repositories.historicalImports, teams, players),
  schedules,
  matchLogistics,
  results,
  imports: new ImportService(
    repositories.imports,
    seasons,
    teams,
    schedules,
  ),
  statistics,
  rankings,
  publicPlayers,
  standings,
  playoffs,
};
