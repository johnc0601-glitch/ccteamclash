import {createClient} from '@/lib/supabase/server';

export type MediaAsset = {
  id: string;
  url: string;
  thumbnailUrl: string;
  bucket: string;
  storagePath: string;
  thumbnailPath: string | null;
  originalFilename: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  altText: string;
  caption: string;
  seasonId: string | null;
  roundId: string | null;
  matchId: string | null;
  teamId: string | null;
  galleryVisible: boolean;
  takenAt: string | null;
  createdAt: string;
  storyReferenceCount?: number;
};

export type PublicGalleryFilters = {
  seasonId?: string;
  teamId?: string;
  matchId?: string;
};

export type PublicGalleryFacet = {id: string; label: string};
export type PublicGalleryFacets = {
  seasons: PublicGalleryFacet[];
  teams: PublicGalleryFacet[];
  matches: PublicGalleryFacet[];
};

type MediaAssetRow = {
  id: string;
  bucket: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  alt_text: string;
  caption: string;
  season_id: string | null;
  round_id: string | null;
  match_id: string | null;
  team_id: string | null;
  gallery_visible: boolean;
  taken_at: string | null;
  created_at: string;
};

const MEDIA_COLUMNS = [
  'id', 'bucket', 'storage_path', 'thumbnail_path', 'original_filename', 'mime_type',
  'width', 'height', 'byte_size', 'alt_text', 'caption', 'season_id', 'round_id',
  'match_id', 'team_id', 'gallery_visible', 'taken_at', 'created_at',
].join(',');

export async function getManagedMediaAssets(limit = 120): Promise<MediaAsset[]> {
  const supabase = await createClient();
  const db = supabase as any;
  const {data, error} = await db
    .from('media_assets')
    .select(MEDIA_COLUMNS)
    .is('deleted_at', null)
    .order('taken_at', {ascending: false, nullsFirst: false})
    .order('created_at', {ascending: false})
    .limit(limit);

  if (error) throw new Error(error.message || 'Photo library could not be loaded.');
  const rows = (data ?? []) as MediaAssetRow[];
  const counts = new Map<string, number>();
  const ids = rows.map((row) => row.id);

  if (ids.length) {
    const {data: references, error: referenceError} = await db
      .from('launch_stories')
      .select('hero_asset_id')
      .in('hero_asset_id', ids);
    if (referenceError) throw new Error(referenceError.message || 'Photo usage could not be checked.');
    for (const reference of references ?? []) {
      const id = typeof reference.hero_asset_id === 'string' ? reference.hero_asset_id : '';
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return rows.map((row) => ({
    ...rowToAsset(supabase, row),
    storyReferenceCount: counts.get(row.id) ?? 0,
  }));
}

export async function getMediaAssetById(id: string): Promise<MediaAsset | null> {
  if (!id) return null;
  const supabase = await createClient();
  const db = supabase as any;
  const {data, error} = await db
    .from('media_assets')
    .select(MEDIA_COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('[media] Media asset could not be loaded.', {id, error: error.message});
    return null;
  }
  return data ? rowToAsset(supabase, data as MediaAssetRow) : null;
}

export async function getPublicGalleryAssets(limit = 72, filters: PublicGalleryFilters = {}): Promise<MediaAsset[]> {
  const supabase = await createClient();
  const db = supabase as any;
  let query = db
    .from('media_assets')
    .select(MEDIA_COLUMNS)
    .eq('gallery_visible', true)
    .is('deleted_at', null);

  if (filters.seasonId) query = query.eq('season_id', filters.seasonId);
  if (filters.teamId) query = query.eq('team_id', filters.teamId);
  if (filters.matchId) query = query.eq('match_id', filters.matchId);

  const {data, error} = await query
    .order('taken_at', {ascending: false, nullsFirst: false})
    .order('created_at', {ascending: false})
    .limit(limit);

  if (error) {
    console.error('[media] Public gallery could not be loaded.', error);
    return [];
  }
  return (data ?? []).map((row: MediaAssetRow) => rowToAsset(supabase, row));
}

export async function getPublicGalleryFacets(): Promise<PublicGalleryFacets> {
  const supabase = await createClient();
  const db = supabase as any;
  const {data, error} = await db
    .from('media_assets')
    .select('season_id,team_id,match_id')
    .eq('gallery_visible', true)
    .is('deleted_at', null)
    .limit(1000);

  if (error) {
    console.error('[media] Public gallery filters could not be loaded.', error);
    return {seasons: [], teams: [], matches: []};
  }

  const seasonIds = uniqueIds(data, 'season_id');
  const directTeamIds = uniqueIds(data, 'team_id');
  const matchIds = uniqueIds(data, 'match_id');

  const matchesResult = matchIds.length
    ? await db.from('launch_schedule_matches').select('id,home_team_id,away_team_id,date').in('id', matchIds)
    : {data: [], error: null};
  if (matchesResult.error) console.error('[media] Gallery match filter labels could not be loaded.', matchesResult.error);

  const matchRows = (matchesResult.data ?? []) as Array<{id: string; home_team_id: string | null; away_team_id: string | null; date: string | null}>;
  const teamIds = Array.from(new Set([
    ...directTeamIds,
    ...matchRows.flatMap((match) => [match.home_team_id, match.away_team_id].filter((value): value is string => Boolean(value))),
  ]));

  const [seasonsResult, teamsResult] = await Promise.all([
    seasonIds.length ? db.from('launch_seasons').select('id,name,year').in('id', seasonIds) : Promise.resolve({data: [], error: null}),
    teamIds.length ? db.from('launch_teams').select('id,name').in('id', teamIds) : Promise.resolve({data: [], error: null}),
  ]);

  if (seasonsResult.error) console.error('[media] Gallery season filter labels could not be loaded.', seasonsResult.error);
  if (teamsResult.error) console.error('[media] Gallery team filter labels could not be loaded.', teamsResult.error);

  const seasons = ((seasonsResult.data ?? []) as Array<{id: string; name: string | null; year: number | null}>)
    .map((season) => ({id: season.id, label: season.name || String(season.year ?? season.id)}))
    .sort((a, b) => a.label.localeCompare(b.label));
  const teamNameById = new Map(((teamsResult.data ?? []) as Array<{id: string; name: string}>).map((team) => [team.id, team.name]));
  const teams = directTeamIds
    .map((id) => ({id, label: teamNameById.get(id) ?? id}))
    .sort((a, b) => a.label.localeCompare(b.label));
  const matches = matchRows
    .map((match) => ({
      id: match.id,
      label: formatMatchFacet(match, teamNameById),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {seasons, teams, matches};
}

export async function updateMediaAsset(
  id: string,
  value: unknown,
): Promise<MediaAsset> {
  if (!value || typeof value !== 'object') throw new Error('Photo details are required.');
  const input = value as Record<string, unknown>;
  const supabase = await createClient();
  const db = supabase as any;

  const updates = {
    caption: cleanText(input.caption),
    alt_text: cleanText(input.altText),
    gallery_visible: input.galleryVisible === true,
    taken_at: normalizeDate(input.takenAt),
    season_id: cleanOptionalText(input.seasonId),
    team_id: cleanOptionalText(input.teamId),
    match_id: cleanOptionalText(input.matchId),
  };

  if (updates.match_id) {
    const {data: match, error: matchError} = await db
      .from('launch_schedule_matches')
      .select('id,season_id')
      .eq('id', updates.match_id)
      .maybeSingle();
    if (matchError || !match) throw new Error(matchError?.message || 'Selected match was not found.');
    if (updates.season_id && updates.season_id !== match.season_id) {
      throw new Error('Selected match does not belong to the selected season.');
    }
    updates.season_id = match.season_id;
  }

  const {data, error} = await db
    .from('media_assets')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select(MEDIA_COLUMNS)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Photo details could not be saved.');
  if (!data) throw new Error('Photo was not found.');
  return rowToAsset(supabase, data as MediaAssetRow);
}

export function rowToAsset(supabase: any, row: MediaAssetRow): MediaAsset {
  const {data} = supabase.storage.from(row.bucket).getPublicUrl(row.storage_path);
  const thumbnailUrl = row.thumbnail_path
    ? supabase.storage.from(row.bucket).getPublicUrl(row.thumbnail_path).data.publicUrl
    : data.publicUrl;
  return {
    id: row.id,
    url: data.publicUrl,
    thumbnailUrl,
    bucket: row.bucket,
    storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    byteSize: row.byte_size,
    altText: row.alt_text ?? '',
    caption: row.caption ?? '',
    seasonId: row.season_id,
    roundId: row.round_id,
    matchId: row.match_id,
    teamId: row.team_id,
    galleryVisible: row.gallery_visible === true,
    takenAt: row.taken_at,
    createdAt: row.created_at,
  };
}

function uniqueIds(rows: unknown[] | null, key: 'season_id' | 'team_id' | 'match_id'): string[] {
  const values = new Set<string>();
  for (const row of rows ?? []) {
    if (!row || typeof row !== 'object') continue;
    const value = (row as Record<string, unknown>)[key];
    if (typeof value === 'string' && value) values.add(value);
  }
  return Array.from(values);
}

function formatMatchFacet(
  match: {id: string; home_team_id: string | null; away_team_id: string | null; date: string | null},
  teamNames: Map<string, string>,
): string {
  const away = match.away_team_id ? teamNames.get(match.away_team_id) ?? match.away_team_id : 'TBD';
  const home = match.home_team_id ? teamNames.get(match.home_team_id) ?? match.home_team_id : 'TBD';
  const date = match.date ? new Date(`${match.date}T12:00:00Z`) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'}).format(date)
    : 'Match';
  return `${dateLabel} · ${away} @ ${home}`;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 1000) : '';
}

function cleanOptionalText(value: unknown): string | null {
  const cleaned = cleanText(value);
  return cleaned || null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(`${value.trim()}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
