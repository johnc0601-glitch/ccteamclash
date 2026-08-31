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
  return (data ?? []).map((row: MediaAssetRow) => rowToAsset(supabase, row));
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

export async function getPublicGalleryAssets(limit = 72): Promise<MediaAsset[]> {
  const supabase = await createClient();
  const db = supabase as any;
  const {data, error} = await db
    .from('media_assets')
    .select(MEDIA_COLUMNS)
    .eq('gallery_visible', true)
    .is('deleted_at', null)
    .order('taken_at', {ascending: false, nullsFirst: false})
    .order('created_at', {ascending: false})
    .limit(limit);

  if (error) {
    console.error('[media] Public gallery could not be loaded.', error);
    return [];
  }
  return (data ?? []).map((row: MediaAssetRow) => rowToAsset(supabase, row));
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
