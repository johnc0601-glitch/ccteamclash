import type {Course} from '@/domain/course/Course';
import type {Season} from '@/domain/season/Season';
import type {Team} from '@/models/Team';

export function getSeasonName(seasonId: string, seasons: Season[]): string {
  return seasons.find((season) => season.id === seasonId)?.name ?? 'Unknown season';
}

export function getTeamName(teamId: string, teams: Team[]): string {
  return teams.find((team) => team.id === teamId)?.name ?? 'Unknown team';
}

export function getCourseName(courseId: string, courses: Course[]): string {
  return courses.find((course) => course.id === courseId)?.name ?? 'Unknown course';
}

export function formatScheduleDate(value: string): string {
  if (!value) return 'Not set';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function formatScheduleTime(value: string): string {
  if (!value) return 'Not set';
  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes));
}
