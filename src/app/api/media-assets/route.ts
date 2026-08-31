import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';
import {getManagedMediaAssets} from '@/services/media/MediaLibraryService';
import {processMediaImage} from '@/services/media/MediaImageProcessor';

const MAX_MEDIA_SIZE_BYTES = 10_000_000;
const ALLOWED_MEDIA_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg']);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStoryCommissioner();
    const assets = await getManagedMediaAssets();
    return Response.json({assets});
  } catch (error) {
    return mediaErrorResponse(error, 'Photo library could not be loaded.');
  }
}

export async function POST(request: Request) {
  try {
    const {supabase, profile} = await requireStoryCommissioner();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) return Response.json({error: 'Choose an image file.'}, {status: 400});
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) return Response.json({error: 'Choose a PNG, JPG, or WebP image.'}, {status: 400});
    if (file.size > MAX_MEDIA_SIZE_BYTES) return Response.json({error: 'Photo is too large. Maximum size is 10 MB.'}, {status: 400});

    const processed = await processMediaImage(file);
    const now = new Date();
    const assetUuid = crypto.randomUUID();
    const prefix = `library/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${assetUuid}`;
    const path = `${prefix}.webp`;
    const thumbnailPath = `${prefix}-thumb.webp`;
    const bucket = 'league-media';

    const {error: uploadError} = await supabase.storage.from(bucket).upload(path, processed.image, {
      upsert: false,
      contentType: processed.mimeType,
      cacheControl: '31536000',
    });
    if (uploadError) return Response.json({error: uploadError.message || 'Photo storage could not save this file.'}, {status: 403});

    const {error: thumbnailError} = await supabase.storage.from(bucket).upload(thumbnailPath, processed.thumbnail, {
      upsert: false,
      contentType: processed.mimeType,
      cacheControl: '31536000',
    });
    if (thumbnailError) {
      await supabase.storage.from(bucket).remove([path]);
      return Response.json({error: thumbnailError.message || 'Photo thumbnail could not be saved.'}, {status: 500});
    }

    const db = supabase as any;
    const {data: asset, error: assetError} = await db
      .from('media_assets')
      .insert({
        bucket,
        storage_path: path,
        thumbnail_path: thumbnailPath,
        original_filename: file.name || null,
        mime_type: processed.mimeType,
        width: processed.width,
        height: processed.height,
        byte_size: processed.byteSize,
        alt_text: cleanText(formData.get('altText')),
        caption: cleanText(formData.get('caption')),
        gallery_visible: formData.get('galleryVisible') === 'true',
        taken_at: normalizeDate(formData.get('takenAt')),
        uploaded_by_profile_id: profile.id,
      })
      .select('id')
      .single();

    if (assetError || !asset) {
      await supabase.storage.from(bucket).remove([path, thumbnailPath]);
      return Response.json({error: assetError?.message || 'Photo metadata could not be saved.'}, {status: 500});
    }

    return Response.json({id: asset.id}, {status: 201});
  } catch (error) {
    return mediaErrorResponse(error, 'Photo could not upload.');
  }
}

function mediaErrorResponse(error: unknown, fallback: string) {
  if (error instanceof StoryAccessError) {
    return Response.json({error: error.message}, {status: error.status});
  }
  const message = error instanceof Error ? error.message : fallback;
  return Response.json({error: message}, {status: 500});
}

function cleanText(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim().slice(0, 1000) : '';
}

function normalizeDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(`${value.trim()}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
