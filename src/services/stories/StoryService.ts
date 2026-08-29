import type {Story, StoryLink} from '@/shared/types';
import {seedStories} from '@/data/stories';
import {createClient} from '@/lib/supabase/server';
import {createSlug} from '@/shared/utils';

// Story records live in Supabase; story image files use Supabase Storage via /api/story-images.
type StoryRow = {
  slug: string;
  title: string;
  category: string;
  display_date: string;
  excerpt: string;
  image: string;
  body: unknown;
  links: unknown;
  featured: boolean;
  sort_order: number;
};

export async function getStories(): Promise<Story[]> {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const {data, error} = await db
      .from('launch_stories')
      .select('slug,title,category,display_date,excerpt,image,body,links,featured,sort_order')
      .order('sort_order', {ascending: true})
      .order('updated_at', {ascending: false});

    if (error) {
      throw error;
    }

    const stories = normalizeStories((data ?? []).map(rowToStory), false);
    return stories.length ? stories : seedStories;
  } catch (error) {
    console.error('[stories] Supabase read failed; falling back to seed stories.', error);
    return seedStories;
  }
}

export async function getStoryBySlug(slug: string): Promise<Story | undefined> {
  const stories = await getStories();
  return stories.find((story) => story.slug === slug);
}

export async function saveStories(stories: Story[]): Promise<Story[]> {
  const normalizedStories = enforceSingleFeatured(normalizeStories(stories, false));
  const supabase = await createClient();
  const db = supabase as any;

  const {error: clearFeaturedError} = await db
    .from('launch_stories')
    .update({featured: false, updated_at: new Date().toISOString()})
    .eq('featured', true);

  if (clearFeaturedError) {
    throw new Error(clearFeaturedError.message || 'Existing homepage feature could not be cleared.');
  }

  if (normalizedStories.length) {
    const now = new Date().toISOString();
    const rows = normalizedStories.map((story, index) => storyToRow(story, index, now));
    const {error: upsertError} = await db
      .from('launch_stories')
      .upsert(rows, {onConflict: 'slug'});

    if (upsertError) {
      throw new Error(upsertError.message || 'Stories could not be saved.');
    }
  }

  const {data: existingRows, error: existingError} = await db
    .from('launch_stories')
    .select('slug');

  if (existingError) {
    throw new Error(existingError.message || 'Existing stories could not be checked.');
  }

  const keepSlugs = new Set(normalizedStories.map((story) => story.slug));
  const staleSlugs = (existingRows ?? [])
    .map((row: {slug?: unknown}) => cleanText(row.slug))
    .filter((slug: string) => slug && !keepSlugs.has(slug));

  if (staleSlugs.length) {
    const {error: deleteError} = await db
      .from('launch_stories')
      .delete()
      .in('slug', staleSlugs);

    if (deleteError) {
      throw new Error(deleteError.message || 'Removed stories could not be deleted.');
    }
  }

  return normalizedStories;
}

function rowToStory(row: StoryRow): Story {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    date: row.display_date,
    excerpt: row.excerpt,
    image: row.image,
    body: Array.isArray(row.body) ? row.body : [],
    links: Array.isArray(row.links) ? row.links as StoryLink[] : undefined,
    featured: row.featured === true,
  };
}

function storyToRow(story: Story, sortOrder: number, updatedAt: string) {
  return {
    slug: story.slug,
    title: story.title,
    category: story.category,
    display_date: story.date,
    excerpt: story.excerpt,
    image: story.image,
    body: story.body,
    links: story.links ?? null,
    featured: story.featured === true,
    sort_order: sortOrder,
    updated_at: updatedAt,
  };
}

function normalizeStories(stories: unknown, fallbackToSeed: boolean): Story[] {
  if (!Array.isArray(stories)) {
    return fallbackToSeed ? seedStories : [];
  }

  const normalized = stories
    .map(normalizeStory)
    .filter((story): story is Story => Boolean(story));

  return normalized.length || !fallbackToSeed ? normalized : seedStories;
}

function normalizeStory(value: unknown): Story | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const story = value as Partial<Story>;
  const title = cleanText(story.title);
  if (!title) {
    return null;
  }

  return {
    slug: createSlug(cleanText(story.slug) || title),
    title,
    excerpt: cleanText(story.excerpt),
    category: cleanText(story.category) || 'Announcement',
    date: cleanText(story.date) || 'Date to be announced',
    image: cleanText(story.image) || 'hero',
    body: Array.isArray(story.body)
      ? story.body.map(cleanText).filter(Boolean)
      : [],
    links: normalizeLinks(story.links),
    featured: story.featured === true,
  };
}

function enforceSingleFeatured(stories: Story[]): Story[] {
  const featuredIndex = stories.findIndex((story) => story.featured === true);
  if (featuredIndex < 0) {
    return stories;
  }

  return stories.map((story, index) => ({
    ...story,
    featured: index === featuredIndex,
  }));
}

function normalizeLinks(links: unknown): StoryLink[] | undefined {
  if (!Array.isArray(links)) {
    return undefined;
  }

  const normalizedLinks = links
    .map((link) => {
      if (!link || typeof link !== 'object') {
        return null;
      }

      const candidate = link as Partial<StoryLink>;
      const label = cleanText(candidate.label);
      const url = cleanText(candidate.url);

      return label && url ? {label, url} : null;
    })
    .filter((link): link is StoryLink => Boolean(link));

  return normalizedLinks.length ? normalizedLinks : undefined;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
