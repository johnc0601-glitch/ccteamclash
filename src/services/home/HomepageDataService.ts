import 'server-only';

import {unstable_cache} from 'next/cache';
import type {PublicScheduleEvent, ScheduleEventBucket} from '@/domain/schedule/ScheduleService';
import {createPublicClient} from '@/lib/supabase/public';
import type {Team} from '@/models/Team';
import type {HomepageMatchFeedPreview} from '@/services/media/HomepageMatchFeedService';
import type {HomepageStory, HomepageStoryData} from '@/services/stories/HomepageStoryService';
import {easternDate} from '@/services/weather/MatchWeather';

const MATCH_DISPLAY_WINDOW_DAYS = 14;
const RECENT_ROUND_HOLD_DAYS = 3;
const HOME_STORY_COLUMNS = 'id,slug,title,published_at,image,body,featured';
const LATEST_STORY_COUNT = 2;
const HOMEPAGE_CACHE_SECONDS = 86_400;

export type HomepagePublishedScore = {
  awayScore: number;
  homeScore: number;
};

export type HomepageData = {
  storyData: HomepageStoryData;
  teams: Team[];
  homeEvents: PublicScheduleEvent[];
  publishedScores: Map<string, HomepagePublishedScore>;
  roundLabel: string;
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
  identities: any[];
  previews: any[];
};

type HomepageScheduleEvent = PublicScheduleEvent & {
  roundId: string;
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
      identitiesResult,
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
      db.from('launch_rounds').select('id,schedule_id,number,date,published').eq('published', true),
      db
        .from('launch_schedule_matches')
        .select('id,round_id,home_team_id,away_team_id,course_id,date,time,status'),
      db.from('launch_schedule_matches').select('id,public_slug'),
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
    if (identitiesResult.error && !identitySchemaUnavailable(identitiesResult.error)) {
      logHomepageReadError('match public identities', identitiesResult.error);
    }
    logHomepageReadError('Matchday previews', previewsResult.error);

    return {
      featured: featuredResult.data ?? [],
      latest: latestResult.data ?? [],
      teams: teamsResult.data ?? [],
      courses: coursesResult.data ?? [],
      schedules: schedulesResult.data ?? [],
      rounds: roundsResult.data ?? [],
      matches: matchesResult.data ?? [],
      identities: identitiesResult.data ?? [],
      previews: previewsResult.data ?? [],
    };
  },
  ['public-homepage-rows-v4'],
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
  const publicSlugs = new Map<string, string>(
    rows.identities
      .map((row: any) => [clean(row.id), clean(row.public_slug)] as const)
      .filter(([id, slug]) => Boolean(id && slug)),
  );
  const publishedScheduleIds = new Set<string>(
    rows.schedules.filter((row: any) => row.published === true).map((row: any) => clean(row.id)),
  );
  const publishedRounds = rows.rounds.filter(
    (row: any) => row.published === true && publishedScheduleIds.has(clean(row.schedule_id)),
  );
  const publishedRoundIds = new Set<string>(publishedRounds.map((row: any) => clean(row.id)));
  const roundDates = new Map<string, string>(
    publishedRounds
      .map((row: any) => [clean(row.id), clean(row.date)] as const)
      .filter(([id, date]) => Boolean(id && date)),
  );

  const events: HomepageScheduleEvent[] = rows.matches
    .filter((row: any) => publishedRoundIds.has(clean(row.round_id)))
    .map((row: any) => mapPublicEvent(row, teamNames, courses, publicSlugs, roundDates, referenceDate))
    .filter((event: HomepageScheduleEvent | null): event is HomepageScheduleEvent => Boolean(event))
    .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime());

  // Matchday takes priority; keep the completed round visible briefly so
  // official scores do not disappear as soon as the next round becomes upcoming.
  const today = easternDate(referenceDate);
  const todayMatch = events.find((event) => event.scheduledDate === today);
  const upcoming = events.filter((event) => event.bucket === 'upcoming');
  const recent = events
    .filter((event) => event.bucket === 'recent')
    .sort((left, right) => right.dateTime.getTime() - left.dateTime.getTime());
  const latestRecent = recent[0];
  const recentAge = latestRecent?.scheduledDate
    ? daysBetweenDates(latestRecent.scheduledDate, today)
    : Infinity;
  const displayedRoundId = todayMatch?.roundId
    ?? (latestRecent && recentAge >= 0 && recentAge <= RECENT_ROUND_HOLD_DAYS ? latestRecent.roundId : undefined)
    ?? upcoming[0]?.roundId
    ?? latestRecent?.roundId;
  const homeEvents = displayedRoundId
    ? events
      .filter((event) => event.roundId === displayedRoundId)
      .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime())
      .slice(0, 4)
    : [];

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

  // Use the same published result that powers Matchday; never expose draft
  // scores. Only read the four displayed matches, and only on page regeneration.
  const publishedScores = new Map<string, HomepagePublishedScore>();
  if (homeEvents.length) {
    const {data: results, error: resultsError} = await (publicSupabase as any)
      .from('launch_match_results')
      .select('match_id,away_score,home_score')
      .eq('status', 'Published')
      .in('match_id', homeEvents.map((event) => event.id));
    logHomepageReadError('published match scores', resultsError);
    for (const result of results ?? []) {
      const awayScore = parsePublishedScore(result.away_score);
      const homeScore = parsePublishedScore(result.home_score);
      if (awayScore !== null && homeScore !== null && homeMatchIds.has(clean(result.match_id))) {
        publishedScores.set(clean(result.match_id), {awayScore, homeScore});
      }
    }
  }

  const displayedRound = publishedRounds.find((round: any) => clean(round.id) === homeEvents[0]?.roundId);
  const roundLabel = displayedRound?.number ? `Round ${displayedRound.number}` : 'Matches';
  return {storyData, teams, homeEvents, publishedScores, feedPreviews, roundLabel};
}

function mapPublicEvent(
  row: any,
  teamNames: ReadonlyMap<string, string>,
  courses: ReadonlyMap<string, {name: string; mapUrl: string}>,
  publicSlugs: ReadonlyMap<string, string>,
  roundDates: ReadonlyMap<string, string>,
  referenceDate: Date,
): HomepageScheduleEvent | null {
  const id = clean(row.id);
  const roundId = clean(row.round_id);
  const homeTeamId = clean(row.home_team_id);
  const awayTeamId = clean(row.away_team_id);
  const courseId = clean(row.course_id);
  const date = clean(row.date);
  const time = clean(row.time).slice(0, 5);
  const storedStatus = clean(row.status);
  const anchorDate = date || roundDates.get(roundId) || '';
  if (!id || !roundId || !homeTeamId || !awayTeamId || !courseId || !anchorDate || !time) return null;
  if (storedStatus === 'Cancelled') return null;

  const dateTime = new Date(`${anchorDate}T${time}:00`);
  const safeDateTime = Number.isNaN(dateTime.getTime())
    ? new Date(`${anchorDate}T00:00:00`)
    : dateTime;
  const bucket = storedStatus === 'Completed'
    ? getCompletedEventBucket(anchorDate, referenceDate)
    : getEventBucket(anchorDate, referenceDate);
  const course = courses.get(courseId);
  const publicRef = publicSlugs.get(id) || id;

  return {
    id,
    roundId,
    href: `/matches/${encodeURIComponent(publicRef)}`,
    date: date ? formatEventDate(date) : formatEventDate(anchorDate),
    scheduledDate: anchorDate,
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

function getEventBucket(eventDate: string, referenceDate: Date): ScheduleEventBucket {
  const today = easternDate(referenceDate);
  if (eventDate >= today) return 'upcoming';
  return eventDate >= dateKeyDaysBefore(today, MATCH_DISPLAY_WINDOW_DAYS) ? 'recent' : 'past';
}

function getCompletedEventBucket(eventDate: string, referenceDate: Date): ScheduleEventBucket {
  const today = easternDate(referenceDate);
  return eventDate >= dateKeyDaysBefore(today, MATCH_DISPLAY_WINDOW_DAYS) ? 'recent' : 'past';
}

function dateKeyDaysBefore(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function daysBetweenDates(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T12:00:00.000Z`) - Date.parse(`${from}T12:00:00.000Z`)) / 86_400_000,
  );
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

function parsePublishedScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && Number.isInteger(score * 2) ? score : null;
}

function safeCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function identitySchemaUnavailable(error: any): boolean {
  return error?.code === '42703' || /public_slug/i.test(String(error?.message ?? ''));
}

function logHomepageReadError(label: string, error: any): void {
  if (!error) return;
  console.error(`[home] ${label} could not be loaded.`, error);
}
