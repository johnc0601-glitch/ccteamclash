import 'server-only';

import {unstable_cache} from 'next/cache';
import type {PublicScheduleEvent, ScheduleEventBucket} from '@/domain/schedule/ScheduleService';
import type {Season} from '@/domain/season/Season';
import {TEAM_MOCK_DATA} from '@/data/teams';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createPublicClient} from '@/lib/supabase/public';
import type {Team} from '@/models/Team';
import type {SeasonStandings, TeamStanding} from '@/services/standings/StandingsTypes';

const PUBLIC_SEASON_CACHE_SECONDS = 30;
const MATCH_DISPLAY_WINDOW_DAYS = 14;

type PublicSeasonRows = {
  teams: any[];
  courses: any[];
  season: any | null;
  schedules: any[];
  rounds: any[];
  matches: any[];
  results: any[];
};

type CourseSummary = {
  id: string;
  name: string;
  mapUrl: string;
};

const loadPublicSeasonRows = unstable_cache(
  async (): Promise<PublicSeasonRows> => {
    if (!hasSupabaseConfig()) {
      return {
        teams: TEAM_MOCK_DATA.map((team) => ({
          id: team.id,
          name: team.name,
          short_name: team.shortName,
          city: team.city,
          state: team.state,
          captain: team.captain,
          home_course: team.homeCourse,
          logo: team.logo,
          primary_color: team.primaryColor,
          secondary_color: team.secondaryColor,
          website: team.website,
          facebook: team.facebook,
          description: team.description,
          active: team.active,
          created_at: team.createdAt,
          updated_at: team.updatedAt,
        })),
        courses: [],
        season: null,
        schedules: [],
        rounds: [],
        matches: [],
        results: [],
      };
    }

    const supabase = createPublicClient();
    const db = supabase as any;
    const [
      teamsResult,
      coursesResult,
      seasonResult,
      schedulesResult,
      roundsResult,
      matchesResult,
      resultsResult,
    ] = await Promise.all([
      db.from('launch_teams').select('*').order('name'),
      db.from('launch_courses').select('id,name,map_url'),
      db.from('launch_seasons').select('*').eq('active', true).maybeSingle(),
      db.from('launch_schedules').select('id,published').eq('published', true),
      db.from('launch_rounds').select('id,schedule_id,published').eq('published', true),
      db.from('launch_schedule_matches')
        .select('id,round_id,season_id,home_team_id,away_team_id,course_id,date,time,status'),
      db.from('launch_match_results')
        .select('match_id,home_score,away_score,status')
        .eq('status', 'Published'),
    ]);

    throwReadError('teams', teamsResult.error);
    throwReadError('courses', coursesResult.error);
    throwReadError('active season', seasonResult.error);
    throwReadError('published schedules', schedulesResult.error);
    throwReadError('published rounds', roundsResult.error);
    throwReadError('schedule matches', matchesResult.error);
    throwReadError('published results', resultsResult.error);

    return {
      teams: teamsResult.data ?? [],
      courses: coursesResult.data ?? [],
      season: seasonResult.data ?? null,
      schedules: schedulesResult.data ?? [],
      rounds: roundsResult.data ?? [],
      matches: matchesResult.data ?? [],
      results: resultsResult.data ?? [],
    };
  },
  ['public-season-data-v1'],
  {
    revalidate: PUBLIC_SEASON_CACHE_SECONDS,
    tags: [
      'public:schedule',
      'public:standings',
      'public:results',
      'public:season',
      'public:teams',
      'public:courses',
    ],
  },
);

export async function getPublicScheduleEvents(
  referenceDate = new Date(),
): Promise<PublicScheduleEvent[]> {
  const rows = await loadPublicSeasonRows();
  const teams = rows.teams.map(mapTeam);
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));
  const courses = new Map<string, CourseSummary>(
    rows.courses.map((row: any) => {
      const course: CourseSummary = {
        id: clean(row.id),
        name: clean(row.name),
        mapUrl: clean(row.map_url),
      };
      return [course.id, course];
    }),
  );
  const publishedScheduleIds = new Set(
    rows.schedules.filter((row: any) => row.published === true).map((row: any) => clean(row.id)),
  );
  const publishedRoundIds = new Set(
    rows.rounds
      .filter((row: any) => row.published === true && publishedScheduleIds.has(clean(row.schedule_id)))
      .map((row: any) => clean(row.id)),
  );

  return rows.matches
    .filter((row: any) => publishedRoundIds.has(clean(row.round_id)))
    .map((row: any) => mapPublicEvent(row, teamNames, courses, referenceDate))
    .filter((event: PublicScheduleEvent | null): event is PublicScheduleEvent => Boolean(event))
    .sort((left: PublicScheduleEvent, right: PublicScheduleEvent) =>
      left.dateTime.getTime() - right.dateTime.getTime());
}

export async function getPublicActiveSeasonStandings(): Promise<SeasonStandings | undefined> {
  const rows = await loadPublicSeasonRows();
  if (!rows.season) return undefined;

  const season = mapSeason(rows.season);
  const teams = rows.teams.map(mapTeam).filter((team) => team.active);
  const entries = new Map<string, Omit<TeamStanding, 'rank' | 'pointDifferential' | 'winningPercentage'>>(
    teams.map((team) => [team.id, {
      team,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    }]),
  );
  const matchesById = new Map(
    rows.matches
      .filter((row: any) => clean(row.season_id) === season.id)
      .map((row: any) => [clean(row.id), row]),
  );

  for (const result of rows.results) {
    if (result.status !== 'Published') continue;
    const match = matchesById.get(clean(result.match_id));
    if (!match) continue;
    const homeTeamId = clean(match.home_team_id);
    const awayTeamId = clean(match.away_team_id);
    const homeScore = nullableScore(result.home_score);
    const awayScore = nullableScore(result.away_score);
    if (!homeTeamId || !awayTeamId || homeScore === null || awayScore === null) continue;

    const home = entries.get(homeTeamId);
    const away = entries.get(awayTeamId);
    if (!home || !away) continue;

    home.gamesPlayed += 1;
    away.gamesPlayed += 1;
    home.pointsFor += homeScore;
    home.pointsAgainst += awayScore;
    away.pointsFor += awayScore;
    away.pointsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
    } else if (awayScore > homeScore) {
      away.wins += 1;
      home.losses += 1;
    }
  }

  const ranked = [...entries.values()]
    .map((entry): Omit<TeamStanding, 'rank'> => ({
      ...entry,
      pointDifferential: entry.pointsFor - entry.pointsAgainst,
      winningPercentage: entry.gamesPlayed ? entry.wins / entry.gamesPlayed : 0,
    }))
    .sort((left, right) =>
      right.winningPercentage - left.winningPercentage
      || right.pointDifferential - left.pointDifferential
      || right.pointsFor - left.pointsFor
      || left.team.name.localeCompare(right.team.name, undefined, {sensitivity: 'base'})
      || left.team.id.localeCompare(right.team.id),
    )
    .map((entry, index) => ({...entry, rank: index + 1}));

  return {season, entries: ranked};
}

function mapPublicEvent(
  row: any,
  teamNames: ReadonlyMap<string, string>,
  courses: ReadonlyMap<string, CourseSummary>,
  referenceDate: Date,
): PublicScheduleEvent | null {
  const id = clean(row.id);
  const homeTeamId = clean(row.home_team_id);
  const awayTeamId = clean(row.away_team_id);
  const courseId = clean(row.course_id);
  const date = clean(row.date);
  const time = clean(row.time).slice(0, 5);
  if (!id || !homeTeamId || !awayTeamId || !courseId || !date || !time) return null;

  const dateTime = new Date(`${date}T${time}:00`);
  const safeDateTime = Number.isNaN(dateTime.getTime())
    ? new Date(`${date}T00:00:00`)
    : dateTime;
  const bucket = getEventBucket(safeDateTime, referenceDate);
  const course = courses.get(courseId);

  return {
    id,
    href: `/matches/${id}`,
    date: formatEventDate(date),
    time: formatEventTime(time),
    course: course?.name ?? courseId,
    directionsUrl: course?.mapUrl ?? '',
    home: teamNames.get(homeTeamId) ?? homeTeamId,
    away: teamNames.get(awayTeamId) ?? awayTeamId,
    homeTeamId,
    awayTeamId,
    dateTime: safeDateTime,
    bucket,
    status: bucket === 'upcoming' ? 'Scheduled' : bucket === 'recent' ? 'Recent' : 'Past',
  };
}

function mapTeam(row: any): Team {
  const mapped: Team = {
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
  const seed = TEAM_MOCK_DATA.find((team) => team.id === mapped.id)
    ?? TEAM_MOCK_DATA.find((team) => team.name.toLocaleLowerCase() === mapped.name.toLocaleLowerCase());
  if (!seed) return mapped;
  return {
    ...mapped,
    city: mapped.city || seed.city,
    state: mapped.state || seed.state,
    captain: mapped.captain || seed.captain,
    homeCourse: mapped.homeCourse || seed.homeCourse,
    logo: mapped.logo || seed.logo,
    primaryColor: mapped.primaryColor || seed.primaryColor,
    secondaryColor: mapped.secondaryColor || seed.secondaryColor,
    website: mapped.website || seed.website,
    facebook: mapped.facebook || seed.facebook,
    description: mapped.description || seed.description,
  };
}

function mapSeason(row: any): Season {
  return {
    id: clean(row.id),
    leagueId: clean(row.league_id),
    name: clean(row.name),
    year: Number(row.year) || 0,
    description: clean(row.description),
    startDate: clean(row.start_date),
    endDate: clean(row.end_date),
    registrationOpen: row.registration_open === true,
    active: row.active === true,
    published: row.published === true,
    archived: row.archived === true,
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}

function getEventBucket(dateTime: Date, referenceDate: Date): ScheduleEventBucket {
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const eventDay = new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate());
  if (eventDay.getTime() >= today.getTime()) return 'upcoming';
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - MATCH_DISPLAY_WINDOW_DAYS);
  return eventDay.getTime() >= cutoff.getTime() ? 'recent' : 'past';
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatEventTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function nullableScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function throwReadError(label: string, error: any): void {
  if (!error) return;
  throw new Error(`[public-season] ${label} could not be loaded: ${error.message ?? String(error)}`);
}
