import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import {ScheduleService} from '@/domain/schedule/ScheduleService';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {TeamService} from '@/services/TeamService';

const repositories = {
  teams: new MockTeamRepository(),
  seasons: new MockSeasonRepository(),
  schedules: new MockScheduleRepository(),
  courses: new MockCourseRepository(),
};

const teams = new TeamService(repositories.teams);
const seasons = new SeasonService(repositories.seasons);

export const services = {
  teams,
  seasons,
  schedules: new ScheduleService(
    repositories.schedules,
    seasons,
    teams,
    repositories.courses,
  ),
};
