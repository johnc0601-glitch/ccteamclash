import {createClient} from '@/lib/supabase/server';
import type {Story} from '@/shared/types';

export type HomepageStory = Pick<Story, 'id' | 'slug' | 'title' | 'publishedAt' | 'image' | 'body' | 'featured'>;

export type HomepageStoryData = {
  lead: HomepageStory | null;
  latest: HomepageStory[];
};

const HOME_STORY_COLUMNS = 'id,slug,title,published_at,image,body,featured';
const LATEST_STORY_COUNT = 2;

export async function getHomepageStories(): Promise<HomepageStoryData> {
  try {
    const supabase = await createClient();
    const db = supabase as any;

    const [{data: featuredRows, error: featuredError}, {data: latestRows, error: latestError}] = await Promise.all([
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
    ]);

    if (featuredError) throw featuredError;
    if (latestError) throw latestError;

    const latest = (latestRows ?? []).map(mapHomepageStory);
    const featured = featuredRows?.[0] ? mapHomepageStory(featuredRows[0]) : null;

    return {
      lead: featured ?? latest[0] ?? null,
      latest,
    };
  } catch (error) {
    console.error('[stories] Homepage story content could not be loaded.', error);
    return {lead: null, latest: []};
  }
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

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
