import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import {MockHistoricalImportRepository} from '@/domain/history/HistoricalImportRepository';
import {HistoricalImportService} from '@/domain/history/HistoricalImportService';
import {MockImportRepository} from '@/domain/import/ImportRepository';
import {ImportService} from '@/domain/import/ImportService';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import {ScheduleService} from '@/domain/schedule/ScheduleService';
import {SupabaseScheduleRepository} from '@/domain/schedule/SupabaseScheduleRepository';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {createClient as createBrowserSupabaseClient} from '@/lib/supabase/client';
import {hasSupabaseConfig} from '@/lib/supabase';
import {MockPlayerRepository} from '@/repositories/PlayerRepository';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {PlayerService} from '@/services/PlayerService';
import {TeamService} from '@/services/TeamService';

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
};

const teams = new TeamService(repositories.teams);
const scheduleTeams = browserSupabase
  ? new TeamService(new SupabaseScheduleTeamRepository(browserSupabase))
  : teams;
const players = new PlayerService(repositories.players, teams);
const seasons = new SeasonService(repositories.seasons);
const schedules = new ScheduleService(
  repositories.schedules,
  seasons,
  scheduleTeams,
  repositories.courses,
);

export const services = {
  historicalImports: new HistoricalImportService(repositories.historicalImports, teams, players),
  imports: new ImportService(
    repositories.imports,
    seasons,
    teams,
    schedules,
  ),
};
