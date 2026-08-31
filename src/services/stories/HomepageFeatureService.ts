import {createClient} from '@/lib/supabase/server';
import type {Story} from '@/shared/types';
import {StoryConflictError, StoryValidationError} from './StoryService';

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
};

const STORY_COLUMNS = [
  'id', 'slug', 'title', 'category', 'published_at', 'image', 'hero_asset_id',
  'body', 'links', 'featured', 'status', 'revision', 'updated_at',
  'season_id', 'round_id', 'match_id', 'team_id',
].join(',');

export async function featurePublishedStory(
  id: string,
  expectedRevision: number,
  actorProfileId: string,
): Promise<Story> {
  const supabase = await createClient();
  const db = supabase as any;

  const {data: current, error: currentError} = await db
    .from('launch_stories')
    .select(STORY_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (currentError) throw new Error(currentError.message || 'Story could not be loaded.');
  if (!current) throw new StoryValidationError('Story was not found.');
  if (current.status !== 'published') throw new StoryValidationError('Publish the story before featuring it on the homepage.');
  if (current.revision !== expectedRevision) throw new StoryConflictError();
  if (current.featured === true) return rowToStory(current);

  const now = new Date().toISOString();
  const {error: clearError} = await db
    .from('launch_stories')
    .update({featured: false, updated_at: now, updated_by_profile_id: actorProfileId})
    .eq('featured', true)
    .neq('id', id);

  if (clearError) throw new Error(clearError.message || 'Existing homepage story could not be cleared.');

  const {data, error} = await db
    .from('launch_stories')
    .update({
      featured: true,
      revision: expectedRevision + 1,
      updated_at: now,
      updated_by_profile_id: actorProfileId,
    })
    .eq('id', id)
    .eq('revision', expectedRevision)
    .eq('status', 'published')
    .select(STORY_COLUMNS)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Story could not be featured.');
  if (!data) throw new StoryConflictError();
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
    status: row.status === 'archived' ? 'archived' : row.status === 'published' ? 'published' : 'draft',
    revision: Number.isInteger(row.revision) && row.revision > 0 ? row.revision : 1,
    updatedAt: row.updated_at,
    seasonId: row.season_id,
    roundId: row.round_id,
    matchId: row.match_id,
    teamId: row.team_id,
  };
}

function normalizeLinks(value: unknown): {label: string; url: string}[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const links = value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as {label?: unknown; url?: unknown};
    const label = cleanText(candidate.label);
    const url = cleanText(candidate.url);
    return label && url ? [{label, url}] : [];
  });
  return links.length ? links : undefined;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
