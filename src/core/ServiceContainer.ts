import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {MockImportRepository} from '@/domain/import/ImportRepository';
import {ImportService} from '@/domain/import/ImportService';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import {ScheduleService} from '@/domain/schedule/ScheduleService';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {TeamService} from '@/services/TeamService';
import {MockStatisticsRepository, StatisticsEngine} from '@/services/statistics';

const repositories = {
  teams: new MockTeamRepository(),
  seasons: new MockSeasonRepository(),
  schedules: new MockScheduleRepository(),
  courses: new MockCourseRepository(),
  imports: new MockImportRepository(),
  statistics: new MockStatisticsRepository(),
};

const teams = new TeamService(repositories.teams);
const seasons = new SeasonService(repositories.seasons);
const schedules = new ScheduleService(
  repositories.schedules,
  seasons,
  teams,
  repositories.courses,
);

export const services = {
  teams,
  seasons,
  schedules,
  imports: new ImportService(
    repositories.imports,
    seasons,
    teams,
    schedules,
  ),
  statistics: new StatisticsEngine(repositories.statistics),
};
