import {createClient} from '@/lib/supabase/server';

export type StoryArchiveItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  publishedAt: string | null;
  image: string;
  body: string[];
  seasonId: string | null;
};

export type StoryArchiveFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  seasonId?: string;
};

export type StoryArchiveResult = {
  stories: StoryArchiveItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: string[];
  seasons: Array<{id: string; name: string}>;
};

const ARCHIVE_COLUMNS = 'id,slug,title,category,published_at,image,body,season_id';
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 24;

export async function getStoryArchive(filters: StoryArchiveFilters = {}): Promise<StoryArchiveResult> {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const pageSize = clampInteger(filters.pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
    const requestedPage = clampInteger(filters.page, 1, 100000, 1);
    const search = clean(filters.search).slice(0, 80);
    const category = clean(filters.category);
    const seasonId = clean(filters.seasonId);

    let query = db
      .from('launch_stories')
      .select(ARCHIVE_COLUMNS, {count: 'exact'})
      .eq('status', 'published');

    if (search) query = query.ilike('title', `%${escapeLike(search)}%`);
    if (category) query = query.eq('category', category);
    if (seasonId) query = query.eq('season_id', seasonId);

    const offset = (requestedPage - 1) * pageSize;
    const [{data, count, error}, facets] = await Promise.all([
      query
        .order('published_at', {ascending: false, nullsFirst: false})
        .order('updated_at', {ascending: false})
        .range(offset, offset + pageSize - 1),
      loadFacets(db),
    ]);

    if (error) throw error;

    const total = Number(count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);

    if (page !== requestedPage && total > 0) {
      return getStoryArchive({...filters, page});
    }

    return {
      stories: (data ?? []).map(mapArchiveRow),
      total,
      page,
      pageSize,
      totalPages,
      categories: facets.categories,
      seasons: facets.seasons,
    };
  } catch (error) {
    console.error('[stories] Story archive could not be loaded.', error);
    return {
      stories: [],
      total: 0,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalPages: 1,
      categories: [],
      seasons: [],
    };
  }
}

async function loadFacets(db: any): Promise<{categories: string[]; seasons: Array<{id: string; name: string}>}> {
  const {data: storyFacets, error: facetError} = await db
    .from('launch_stories')
    .select('category,season_id')
    .eq('status', 'published');
  if (facetError) throw facetError;

  const categoryValues: string[] = (storyFacets ?? [])
    .map((row: any) => clean(row.category))
    .filter((value: string) => Boolean(value));
  const categories: string[] = [...new Set<string>(categoryValues)]
    .sort((a, b) => a.localeCompare(b));

  const seasonValues: string[] = (storyFacets ?? [])
    .map((row: any) => clean(row.season_id))
    .filter((value: string) => Boolean(value));
  const seasonIds: string[] = [...new Set<string>(seasonValues)];

  if (seasonIds.length === 0) return {categories, seasons: []};

  const {data: seasons, error: seasonError} = await db
    .from('launch_seasons')
    .select('id,name,year')
    .in('id', seasonIds)
    .order('year', {ascending: false});
  if (seasonError) throw seasonError;

  return {
    categories,
    seasons: (seasons ?? []).map((season: any) => ({
      id: String(season.id),
      name: clean(season.name) || String(season.id),
    })),
  };
}

function mapArchiveRow(row: any): StoryArchiveItem {
  return {
    id: String(row.id),
    slug: clean(row.slug),
    title: clean(row.title),
    category: clean(row.category) || 'Story',
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
    image: clean(row.image) || 'hero',
    body: Array.isArray(row.body) ? row.body.map(clean).filter(Boolean) : [],
    seasonId: clean(row.season_id) || null,
  };
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
