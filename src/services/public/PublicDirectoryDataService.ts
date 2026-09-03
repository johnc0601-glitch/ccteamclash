import 'server-only';

import {unstable_cache} from 'next/cache';
import {TEAM_MOCK_DATA} from '@/data/teams';
import type {Course} from '@/domain/course/Course';
import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createPublicClient} from '@/lib/supabase/public';
import type {Team} from '@/models/Team';

const PUBLIC_DIRECTORY_CACHE_SECONDS = 60;

export type PublicDirectoryData = {
  teams: Team[];
  courses: Course[];
  activeSeasonName: string;
};

/**
 * Shared, cookie-free public directory data for Teams and Courses.
 *
 * These rows are safe to share across visitors because they are read only with
 * the publishable key and public RLS. Management screens continue using their
 * request-scoped authenticated repositories.
 */
export const getPublicDirectoryData = unstable_cache(
  async (): Promise<PublicDirectoryData> => {
    if (!hasSupabaseConfig()) {
      return {
        teams: TEAM_MOCK_DATA.filter((team) => team.active).map((team) => ({...team})),
        courses: (await new MockCourseRepository().getAll()).filter((course) => course.active),
        activeSeasonName: 'Current season',
      };
    }

    const supabase = createPublicClient();
    const db = supabase as any;
    const [teamsResult, coursesResult, seasonResult] = await Promise.all([
      db.from('launch_teams').select('*').eq('active', true).order('name'),
      db.from('launch_courses').select('*').eq('active', true).order('name'),
      db.from('launch_seasons').select('name').eq('active', true).maybeSingle(),
    ]);

    if (teamsResult.error) throw teamsResult.error;
    if (coursesResult.error) throw coursesResult.error;
    if (seasonResult.error) throw seasonResult.error;

    return {
      teams: mergeSeedTeamDefaults((teamsResult.data ?? []).map(mapTeam), TEAM_MOCK_DATA),
      courses: (coursesResult.data ?? []).map(mapCourse),
      activeSeasonName: clean(seasonResult.data?.name) || 'Current season',
    };
  },
  ['public-directory-data-v1'],
  {
    revalidate: PUBLIC_DIRECTORY_CACHE_SECONDS,
    tags: ['public:teams', 'public:courses', 'public:season'],
  },
);

function mapTeam(row: any): Team {
  return {
    id: clean(row.id),
    name: clean(row.name),
    shortName: clean(row.short_name),
    city: clean(row.city),
    state: clean(row.state).toUpperCase(),
    captain: clean(row.captain),
    homeCourse: clean(row.home_course),
    logo: clean(row.logo),
    primaryColor: clean(row.primary_color) || '#006f71',
    secondaryColor: clean(row.secondary_color) || '#f4f6f2',
    website: clean(row.website),
    facebook: clean(row.facebook),
    description: clean(row.description),
    active: row.active !== false,
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}

function mapCourse(row: any): Course {
  return {
    id: clean(row.id),
    name: clean(row.name),
    city: clean(row.city),
    state: clean(row.state).toUpperCase(),
    address: clean(row.address),
    mapUrl: clean(row.map_url),
    udiscUrl: clean(row.udisc_url),
    photoUrl: clean(row.photo_url),
    description: clean(row.description),
    homeTeamId: clean(row.home_team_id) || undefined,
    active: row.active !== false,
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}

function mergeSeedTeamDefaults(teams: Team[], seedTeams: Team[]): Team[] {
  const seedById = new Map(seedTeams.map((team) => [team.id, team]));
  const seedByName = new Map(seedTeams.map((team) => [team.name.toLocaleLowerCase(), team]));

  return teams.map((team) => {
    const seed = seedById.get(team.id) ?? seedByName.get(team.name.toLocaleLowerCase());
    if (!seed) return team;
    return {
      ...team,
      city: team.city || seed.city,
      state: team.state || seed.state,
      captain: team.captain || seed.captain,
      homeCourse: team.homeCourse || seed.homeCourse,
      logo: team.logo || seed.logo,
      primaryColor: team.primaryColor || seed.primaryColor,
      secondaryColor: team.secondaryColor || seed.secondaryColor,
      website: team.website || seed.website,
      facebook: team.facebook || seed.facebook,
      description: team.description || seed.description,
    };
  });
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
