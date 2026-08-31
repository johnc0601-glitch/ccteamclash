import type {Story, StoryLink, StorySourceFactSnapshot, StoryStatus} from '@/shared/types';
import {createClient} from '@/lib/supabase/server';
import {createSlug} from '@/shared/utils';

type StoryRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  published_at: string | null;
  image: string;
  hero_asset_id: string | null;
  body: unknown;
  links: unknown;
  featured: boolean;
  status: string;
  revision: number;
  updated_at: string;
  season_id: string | null;
  round_id: string | null;
  match_id: string | null;
  team_id: string | null;
  source_fact_snapshot: unknown;
};

const STORY_COLUMNS = [
  'id',
  'slug',
  'title',
  'category',
  'published_at',
  'image',
  'hero_asset_id',
  'body',
  'links',
  'featured',
  'status',
  'revision',
  'updated_at',
  'season_id',
  'round_id',
  'match_id',
  'team_id',
  'source_fact_snapshot',
].join(',');

export class StoryConflictError extends Error {
  constructor() {
    super('This story changed since you opened it. Reload it before saving again.');
    this.name = 'StoryConflictError';
  }
}

export class StoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoryValidationError';
  }
}

export async function getStories(): Promise<Story[]> {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const {data, error} = await db
      .from('launch_stories')
      .select(STORY_COLUMNS)
      .eq('status', 'published')
      .order('published_at', {ascending: false, nullsFirst: false})
      .order('updated_at', {ascending: false});

    if (error) throw error;
    return (data ?? []).map(rowToStory);
  } catch (error) {
    console.error('[stories] Published stories could not be read.', error);
    return [];
  }
}

export async function getManagedStories(): Promise<Story[]> {
  const supabase = await createClient();
  const db = supabase as any;
  const {data, error} = await db
    .from('launch_stories')
    .select(STORY_COLUMNS)
    .order('updated_at', {ascending: false});

  if (error) {
    throw new Error(error.message || 'Stories could not be loaded.');
  }

  return (data ?? []).map(rowToStory);
}

export async function getStoryBySlug(slug: string): Promise<Story | undefined> {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const {data, error} = await db
      .from('launch_stories')
      .select(STORY_COLUMNS)
      .eq('slug', createSlug(slug))
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw error;
    return data ? rowToStory(data) : undefined;
  } catch (error) {
    console.error(`[stories] Story ${slug} could not be read.`, error);
    return undefined;
  }
}

export async function createStory(
  value: unknown,
  actorProfileId: string,
  sourceFactSnapshot: StorySourceFactSnapshot[] = [],
): Promise<Story> {
  const story = normalizeStoryInput(value);
  const supabase = await createClient();
  const db = supabase as any;
  const now = new Date().toISOString();
  const wantsFeatured = story.featured === true && story.status === 'published';

  const {data, error} = await db
    .from('launch_stories')
    .insert({
      slug: story.slug,
      title: story.title,
      category: story.category,
      published_at: story.publishedAt,
      image: story.image,
      hero_asset_id: story.heroAssetId ?? null,
      body: story.body,
      links: story.links ?? null,
      featured: false,
      status: story.status,
      revision: 1,
      season_id: story.seasonId ?? null,
      round_id: story.roundId ?? null,
      match_id: story.matchId ?? null,
      team_id: story.teamId ?? null,
      source_fact_snapshot: sourceFactSnapshot,
      created_by_profile_id: actorProfileId,
      updated_by_profile_id: actorProfileId,
      updated_at: now,
    })
    .select(STORY_COLUMNS)
    .single();

  if (error || !data) {
    throw new StoryValidationError(cleanDatabaseMessage(error?.message, 'Story could not be created.'));
  }

  if (wantsFeatured) {
    await setFeaturedStory(db, data.id, actorProfileId);
    return fetchManagedStoryById(db, data.id);
  }

  return rowToStory(data);
}

export async function updateStory(
  id: string,
  expectedRevision: number,
  value: unknown,
  actorProfileId: string,
): Promise<Story> {
  const supabase = await createClient();
  const db = supabase as any;
  const current = await fetchManagedStoryById(db, id);

  if (current.revision !== expectedRevision) {
    throw new StoryConflictError();
  }

  const story = normalizeStoryInput(value, current);
  if (current.status !== 'draft' && story.slug !== current.slug) {
    throw new StoryValidationError('Published story web addresses are locked so shared links cannot break.');
  }

  const wantsFeatured = story.featured === true && story.status === 'published';
  const nextRevision = expectedRevision + 1;
  const now = new Date().toISOString();
  const {data, error} = await db
    .from('launch_stories')
    .update({
      slug: story.slug,
      title: story.title,
      category: story.category,
      published_at: story.publishedAt,
      image: story.image,
      hero_asset_id: story.heroAssetId ?? null,
      body: story.body,
      links: story.links ?? null,
      featured: false,
      status: story.status,
      revision: nextRevision,
      season_id: story.seasonId ?? null,
      round_id: story.roundId ?? null,
      match_id: story.matchId ?? null,
      team_id: story.teamId ?? null,
      archived_at: story.status === 'archived' ? now : null,
      updated_by_profile_id: actorProfileId,
      updated_at: now,
    })
    .eq('id', id)
    .eq('revision', expectedRevision)
    .select(STORY_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new StoryValidationError(cleanDatabaseMessage(error.message, 'Story could not be saved.'));
  }
  if (!data) {
    throw new StoryConflictError();
  }

  if (wantsFeatured) {
    await setFeaturedStory(db, id, actorProfileId);
    return fetchManagedStoryById(db, id);
  }

  return rowToStory(data);
}

export async function archiveStory(id: string, expectedRevision: number, actorProfileId: string): Promise<Story> {
  const supabase = await createClient();
  const db = supabase as any;
  const now = new Date().toISOString();
  const {data, error} = await db
    .from('launch_stories')
    .update({
      status: 'archived',
      featured: false,
      archived_at: now,
      revision: expectedRevision + 1,
      updated_by_profile_id: actorProfileId,
      updated_at: now,
    })
    .eq('id', id)
    .eq('revision', expectedRevision)
    .select(STORY_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new StoryValidationError(cleanDatabaseMessage(error.message, 'Story could not be archived.'));
  }
  if (!data) {
    throw new StoryConflictError();
  }

  return rowToStory(data);
}

async function setFeaturedStory(db: any, storyId: string, actorProfileId: string): Promise<void> {
  const now = new Date().toISOString();
  const {error: clearError} = await db
    .from('launch_stories')
    .update({featured: false, updated_at: now, updated_by_profile_id: actorProfileId})
    .eq('featured', true)
    .neq('id', storyId);

  if (clearError) {
    throw new Error(clearError.message || 'Existing homepage feature could not be cleared.');
  }

  const {error: featureError} = await db
    .from('launch_stories')
    .update({featured: true, updated_at: now, updated_by_profile_id: actorProfileId})
    .eq('id', storyId)
    .eq('status', 'published');

  if (featureError) {
    throw new Error(featureError.message || 'Story could not be featured.');
  }
}

async function fetchManagedStoryById(db: any, id: string): Promise<Story> {
  const {data, error} = await db
    .from('launch_stories')
    .select(STORY_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Story could not be loaded.');
  if (!data) throw new StoryValidationError('Story was not found.');
  return rowToStory(data);
}

function rowToStory(row: StoryRow): Story {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    publishedAt: row.published_at,
    image: row.image,
    heroAssetId: row.hero_asset_id,
    body: Array.isArray(row.body) ? row.body.map(cleanText).filter(Boolean) : [],
    links: normalizeLinks(row.links),
    featured: row.featured === true,
    status: normalizeStatus(row.status),
    revision: Number.isInteger(row.revision) && row.revision > 0 ? row.revision : 1,
    updatedAt: row.updated_at,
    seasonId: row.season_id,
    roundId: row.round_id,
    matchId: row.match_id,
    teamId: row.team_id,
    sourceFactSnapshot: normalizeSourceFactSnapshot(row.source_fact_snapshot),
  };
}

function normalizeStoryInput(value: unknown, current?: Story): Story {
  if (!value || typeof value !== 'object') {
    throw new StoryValidationError('Story details are required.');
  }

  const input = value as Partial<Story>;
  const title = cleanText(input.title ?? current?.title);
  if (!title) {
    throw new StoryValidationError('Add a headline before saving.');
  }

  const slug = createSlug(cleanText(input.slug ?? current?.slug) || title);
  if (!slug) {
    throw new StoryValidationError('Add a valid web address.');
  }

  const status = normalizeStatus(input.status ?? current?.status ?? 'draft');
  const body = Array.isArray(input.body)
    ? input.body.map(cleanText).filter(Boolean)
    : current?.body ?? [];

  if (status === 'published' && body.length === 0) {
    throw new StoryValidationError('Add story text before publishing.');
  }

  let publishedAt = normalizeDate(input.publishedAt ?? current?.publishedAt ?? null);
  if (status === 'published' && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  return {
    id: current?.id ?? '',
    slug,
    title,
    category: cleanText(input.category ?? current?.category) || 'Announcement',
    publishedAt,
    image: cleanText(input.image ?? current?.image) || 'hero',
    heroAssetId: cleanOptionalText(input.heroAssetId ?? current?.heroAssetId),
    body,
    links: normalizeLinks(input.links ?? current?.links),
    featured: input.featured === true,
    status,
    revision: current?.revision ?? 1,
    updatedAt: current?.updatedAt,
    seasonId: cleanOptionalText(input.seasonId ?? current?.seasonId),
    roundId: cleanOptionalText(input.roundId ?? current?.roundId),
    matchId: cleanOptionalText(input.matchId ?? current?.matchId),
    teamId: cleanOptionalText(input.teamId ?? current?.teamId),
    sourceFactSnapshot: current?.sourceFactSnapshot ?? [],
  };
}

function normalizeStatus(value: unknown): StoryStatus {
  return value === 'published' || value === 'archived' ? value : 'draft';
}

function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeLinks(links: unknown): StoryLink[] | undefined {
  if (!Array.isArray(links)) return undefined;

  const normalized = links
    .map((link) => {
      if (!link || typeof link !== 'object') return null;
      const candidate = link as Partial<StoryLink>;
      const label = cleanText(candidate.label);
      const url = cleanText(candidate.url);
      if (!label || !url) return null;
      if (!url.startsWith('/') && !url.startsWith('https://') && !url.startsWith('http://')) return null;
      return {label, url};
    })
    .filter((link): link is StoryLink => Boolean(link));

  return normalized.length ? normalized : undefined;
}

function normalizeSourceFactSnapshot(value: unknown): StorySourceFactSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is StorySourceFactSnapshot => Boolean(item && typeof item === 'object'));
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanOptionalText(value: unknown): string | null {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function cleanDatabaseMessage(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (message.includes('launch_stories_slug')) return 'That story web address is already in use.';
  return message;
}
