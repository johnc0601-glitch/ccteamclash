import type {Course} from '@/domain/course/Course';
import type {Team} from '@/models/Team';
import type {Player} from '@/models/Player';
import {createMatchId} from '@/services/matches/EventService';
import type {Match} from '@/shared/types';
import {createSlug} from '@/shared/utils';
export {createMatchId} from '@/services/matches/EventService';

export type PublicMatchdayTeam = {
  team: Team | undefined;
  name: string;
  slug: string;
  logo: string;
  captain: string;
  roster: Player[];
};

export type PublicMatchday = Match & {
  id: string;
  courseDetails: Course | undefined;
  homeTeam: PublicMatchdayTeam;
  awayTeam: PublicMatchdayTeam;
};

export function resolveMatchday(
  match: Match,
  teams: Team[],
  players: Player[],
  courses: Course[],
): PublicMatchday {
  const course = findCourse(courses, match.course);
  const homeTeam = resolveTeam(match.home, teams, players);
  const awayTeam = resolveTeam(match.away, teams, players);

  return {
    ...match,
    id: createMatchId(match),
    courseDetails: course,
    homeTeam,
    awayTeam,
  };
}

function resolveTeam(name: string, teams: Team[], players: Player[]): PublicMatchdayTeam {
  const slug = createSlug(name);
  const team = teams.find((candidate) => candidate.id === slug || createSlug(candidate.name) === slug);
  const teamRoster = team
    ? players
      .filter((player) => player.active && player.teamId === team.id)
      .sort((left, right) => left.name.localeCompare(right.name, undefined, {sensitivity: 'base'}))
    : [];

  return {
    team,
    name: team?.name ?? name,
    slug: team?.id ?? slug,
    logo: team?.logo ?? '',
    captain: team?.captain ?? 'Captain pending',
    roster: teamRoster,
  };
}

function findCourse(courses: Course[], name: string): Course | undefined {
  const normalizedName = name.trim().toLocaleLowerCase();
  const courseSlug = createSlug(name);
  return courses.find((course) => {
    const candidateName = course.name.trim().toLocaleLowerCase();
    const candidateSlug = createSlug(course.name);
    const sharedWords = candidateSlug
      .split('-')
      .filter((word) => word.length > 3 && courseSlug.includes(word));

    return candidateName === normalizedName
      || candidateSlug === courseSlug
      || sharedWords.length >= 2;
  });
}
