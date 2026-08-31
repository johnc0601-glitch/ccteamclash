import {processMediaImage} from '@/services/media/MediaImageProcessor';
import {requireStoryCommissioner, StoryAccessError} from '@/services/stories/StoryEditorAccess';

const MAX_STORY_IMAGE_SIZE_BYTES = 10_000_000;
const ALLOWED_STORY_IMAGE_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const {supabase, profile} = await requireStoryCommissioner();
    const formData = await request.formData();
    const file = formData.get('file');
    const requestedStoryId = formData.get('storyId');

    if (!(file instanceof File)) return Response.json({error: 'Choose an image file.'}, {status: 400});
    if (!ALLOWED_STORY_IMAGE_TYPES.has(file.type)) return Response.json({error: 'Choose a PNG, JPG, or WebP image.'}, {status: 400});
    if (file.size > MAX_STORY_IMAGE_SIZE_BYTES) return Response.json({error: 'Story photo is too large. Maximum size is 10 MB.'}, {status: 400});

    const processed = await processMediaImage(file);
    const storyId = typeof requestedStoryId === 'string' && UUID_PATTERN.test(requestedStoryId)
      ? requestedStoryId
      : 'unassigned';
    const assetUuid = crypto.randomUUID();
    const path = `stories/${storyId}/${assetUuid}.webp`;
    const thumbnailPath = `stories/${storyId}/${assetUuid}-thumb.webp`;
    const bucket = 'league-media';

    const {error: uploadError} = await supabase.storage.from(bucket).upload(path, processed.image, {
      upsert: false,
      contentType: processed.mimeType,
      cacheControl: '31536000',
    });
    if (uploadError) {
      return Response.json({error: uploadError.message || 'Story photo storage could not save this file.'}, {status: 403});
    }

    const {error: thumbnailError} = await supabase.storage.from(bucket).upload(thumbnailPath, processed.thumbnail, {
      upsert: false,
      contentType: processed.mimeType,
      cacheControl: '31536000',
    });
    if (thumbnailError) {
      await supabase.storage.from(bucket).remove([path]);
      return Response.json({error: thumbnailError.message || 'Story photo thumbnail could not be saved.'}, {status: 500});
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
        uploaded_by_profile_id: profile.id,
      })
      .select('id,bucket,storage_path,thumbnail_path,mime_type,width,height,byte_size,alt_text,caption')
      .single();

    if (assetError || !asset) {
      await supabase.storage.from(bucket).remove([path, thumbnailPath]);
      return Response.json({error: assetError?.message || 'Photo metadata could not be saved.'}, {status: 500});
    }

    const {data} = supabase.storage.from(bucket).getPublicUrl(path);
    const {data: thumbnailData} = supabase.storage.from(bucket).getPublicUrl(thumbnailPath);
    return Response.json({
      assetId: asset.id,
      url: data.publicUrl,
      thumbnailUrl: thumbnailData.publicUrl,
      path,
      thumbnailPath,
      bucket,
      width: processed.width,
      height: processed.height,
      byteSize: processed.byteSize,
    });
  } catch (error) {
    if (error instanceof StoryAccessError) {
      return Response.json({error: error.message}, {status: error.status});
    }
    const message = error instanceof Error ? error.message : 'Story photo could not upload.';
    return Response.json({error: message}, {status: 500});
  }
}
