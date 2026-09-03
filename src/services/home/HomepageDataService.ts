import 'server-only';

import {unstable_cache} from 'next/cache';
import type {PublicScheduleEvent, ScheduleEventBucket} from '@/domain/schedule/ScheduleService';
import {createPublicClient} from '@/lib/supabase/public';
import type {Team} from '@/models/Team';
import type {HomepageMatchFeedPreview} from '@/services/media/HomepageMatchFeedService';
import type {HomepageStory, HomepageStoryData} from '@/services/stories/HomepageStoryService';

const MATCH_DISPLAY_WINDOW_DAYS = 14;
const HOME_STORY_COLUMNS = 'id,slug,title,published_at,image,body,featured';
const LATEST_STORY_COUNT = 2;
const HOMEPAGE_CACHE_SECONDS = 60;

export type HomepageData = {
  storyData: HomepageStoryData;
  teams: Team[];
  homeEvents: PublicScheduleEvent[];
  feedPreviews: Map<string, HomepageMatchFeedPreview>;
};

type HomepageRows = {
  featured: any[];
  latest: any[];
  teams: any[];
  courses: any[];
  schedules: any[];
  rounds: any[];
  matches: any[];
  previews: any[];
};

/**
 * Loads the cookie-free public rows shared by every homepage visitor.
 *
 * The cache scope intentionally uses createPublicClient(), never the SSR client,
 * so an authenticated commissioner/captain result cannot become shared cache
 * content. Public RLS remains the source of truth for which rows are visible.
 */
const getCachedHomepageRows = unstable_cache(
  async (): Promise<HomepageRows> => {
    const supabase = createPublicClient();
    const db = supabase as any;

    const [
      featuredResult,
      latestResult,
      teamsResult,
      coursesResult,
      schedulesResult,
      roundsResult,
      matchesResult,
      previewsResult,
    ] = await Promise.all([
      db
        .from('launch_stories')
        .select(HOME_STORY_COLUMNS)
        .eq('status', 'published')
        .eq('featured', true)
        .order('published_at', {ascending: false, nullsFirst: false})
        .limit(1),
      db
        .from('launch_stories')
        .select(HOME_STORY_COLUMNS)
        .eq('status', 'published')
        .order('published_at', {ascending: false, nullsFirst: false})
        .order('updated_at', {ascending: false})
        .limit(LATEST_STORY_COUNT),
      db.from('launch_teams').select('*').order('name', {ascending: true}),
      db.from('launch_courses').select('id,name,map_url'),
      db.from('launch_schedules').select('id,published').eq('published', true),
      db.from('launch_rounds').select('id,schedule_id,published').eq('published', true),
      db
        .from('launch_schedule_matches')
        .select('id,round_id,home_team_id,away_team_id,course_id,date,time,status'),
      db
        .from('launch_homepage_match_feed_previews')
        .select('match_id,author_name_snapshot,body,image_path,comment_count,reaction_count'),
    ]);

    logHomepageReadError('featured stories', featuredResult.error);
    logHomepageReadError('latest stories', latestResult.error);
    logHomepageReadError('teams', teamsResult.error);
    logHomepageReadError('courses', coursesResult.error);
    logHomepageReadError('schedules', schedulesResult.error);
    logHomepageReadError('rounds', roundsResult.error);
    logHomepageReadError('matches', matchesResult.error);
    logHomepageReadError('Matchday previews', previewsResult.error);

    return {
      featured: featuredResult.data ?? [],
      latest: latestResult.data ?? [],
      teams: teamsResult.data ?? [],
      courses: coursesResult.data ?? [],
      schedules: schedulesResult.data ?? [],
      rounds: roundsResult.data ?? [],
      matches: matchesResult.data ?? [],
      previews: previewsResult.data ?? [],
    };
  },
  ['public-homepage-rows-v1'],
  {
    revalidate: HOMEPAGE_CACHE_SECONDS,
    tags: ['public:homepage', 'public:stories', 'public:teams', 'public:schedule', 'public:match-feed'],
  },
);

/**
 * Builds the visitor-independent homepage model from cached public rows.
 * Date bucketing still happens on every request so upcoming/recent status is
 * always computed using the current request date rather than a cached Date.
 */
export async function getHomepageData(referenceDate = new Date()): Promise<HomepageData> {
  const rows = await getCachedHomepageRows();
  const publicSupabase = createPublicClient();

  const latest: HomepageStory[] = rows.latest.map((row: any) => mapHomepageStory(row));
  const featured = rows.featured[0] ? mapHomepageStory(rows.featured[0]) : null;
  const storyData: HomepageStoryData = {
    lead: featured ?? latest[0] ?? null,
    latest,
  };

  const teams: Team[] = rows.teams.map((row: any) => mapTeam(row));
  const teamNames = new Map(teams.map((team: Team) => [team.id, team.name]));
  const courses = new Map<string, {name: string; mapUrl: string}>(
    rows.courses.map((row: any) => [
      clean(row.id),
      {name: clean(row.name), mapUrl: clean(row.map_url)},
    ]),
  );
  const publishedScheduleIds = new Set<string>(
    rows.schedules.filter((row: any) => row.published === true).map((row: any) => clean(row.id)),
  );
  const publishedRoundIds = new Set<string>(
    rows.rounds
      .filter((row: any) => row.published === true && publishedScheduleIds.has(clean(row.schedule_id)))
      .map((row: any) => clean(row.id)),
  );

  const events: PublicScheduleEvent[] = rows.matches
    .filter((row: any) => publishedRoundIds.has(clean(row.round_id)))
    .map((row: any) => mapPublicEvent(row, teamNames, courses, referenceDate))
    .filter((event: PublicScheduleEvent | null): event is PublicScheduleEvent => Boolean(event))
    .sort((left: PublicScheduleEvent, right: PublicScheduleEvent) => left.dateTime.getTime() - right.dateTime.getTime());

  const upcoming: PublicScheduleEvent[] = events.filter((event) => event.bucket === 'upcoming');
  const homeEvents: PublicScheduleEvent[] = (upcoming.length > 0
    ? upcoming.filter((event) => dateKey(event.dateTime) === dateKey(upcoming[0].dateTime))
    : events
      .filter((event) => event.bucket === 'recent')
      .sort((left, right) => right.dateTime.getTime() - left.dateTime.getTime()))
    .slice(0, 4);

  const homeMatchIds = new Set(homeEvents.map((event) => event.id));
  const feedPreviews = new Map<string, HomepageMatchFeedPreview>();
  for (const row of rows.previews) {
    const matchId = clean(row.match_id);
    if (!homeMatchIds.has(matchId)) continue;
    const imagePath = clean(row.image_path);
    const imageUrl = imagePath
      ? publicSupabase.storage.from('match-feed').getPublicUrl(imagePath).data.publicUrl
      : null;
    feedPreviews.set(matchId, {
      author: clean(row.author_name_snapshot) || 'Member',
      excerpt: clean(row.body).slice(0, 140),
      imageUrl,
      commentCount: safeCount(row.comment_count),
      reactionCount: safeCount(row.reaction_count),
    });
  }

  return {storyData, teams, homeEvents, feedPreviews};
}

function mapPublicEvent(
  row: any,
  teamNames: ReadonlyMap<string, string>,
  courses: ReadonlyMap<string, {name: string; mapUrl: string}>,
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

function dateKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function mapHomepageStory(row: any): HomepageStory {
  return {
    id: String(row.id),
    slug: clean(row.slug),
    title: clean(row.title),
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
    image: clean(row.image) || 'hero',
    body: Array.isArray(row.body) ? row.body.map(clean).filter(Boolean) : [],
    featured: row.featured === true,
  };
}

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

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function logHomepageReadError(label: string, error: any): void {
  if (!error) return;
  console.error(`[home] ${label} could not be loaded.`, error);
}
