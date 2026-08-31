import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';
import {updateMediaAsset} from '@/services/media/MediaLibraryService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: RouteContext) {
  try {
    await requireStoryCommissioner();
    const {id} = await params;
    const payload = await request.json();
    const asset = await updateMediaAsset(id, payload);
    return Response.json({asset});
  } catch (error) {
    return mediaErrorResponse(error, 'Photo details could not be saved.');
  }
}

export async function DELETE(_request: Request, {params}: RouteContext) {
  try {
    const {supabase} = await requireStoryCommissioner();
    const {id} = await params;
    const db = supabase as any;

    const [{data: asset, error: assetError}, {count: storyCount, error: storyError}] = await Promise.all([
      db
        .from('media_assets')
        .select('id,bucket,storage_path,thumbnail_path')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle(),
      db
        .from('launch_stories')
        .select('id', {count: 'exact', head: true})
        .eq('hero_asset_id', id),
    ]);

    if (assetError) throw new Error(assetError.message || 'Photo could not be loaded.');
    if (storyError) throw new Error(storyError.message || 'Photo references could not be checked.');
    if (!asset) return Response.json({error: 'Photo was not found.'}, {status: 404});
    if ((storyCount ?? 0) > 0) {
      return Response.json({error: 'This photo is still used by a story. Choose a different story image before deleting it.'}, {status: 409});
    }

    const paths = [asset.storage_path, asset.thumbnail_path].filter((value): value is string => typeof value === 'string' && value.length > 0);
    if (paths.length) {
      const {error: removeError} = await supabase.storage.from(asset.bucket).remove(paths);
      if (removeError) throw new Error(removeError.message || 'Photo files could not be removed.');
    }

    const {error: deleteError} = await db
      .from('media_assets')
      .update({deleted_at: new Date().toISOString(), gallery_visible: false})
      .eq('id', id)
      .is('deleted_at', null);
    if (deleteError) throw new Error(deleteError.message || 'Photo metadata could not be removed.');

    return Response.json({ok: true});
  } catch (error) {
    return mediaErrorResponse(error, 'Photo could not be removed.');
  }
}

function mediaErrorResponse(error: unknown, fallback: string) {
  if (error instanceof StoryAccessError) {
    return Response.json({error: error.message}, {status: error.status});
  }
  const message = error instanceof Error ? error.message : fallback;
  return Response.json({error: message}, {status: 500});
}
