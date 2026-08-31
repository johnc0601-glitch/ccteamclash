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
    if (error instanceof StoryAccessError) {
      return Response.json({error: error.message}, {status: error.status});
    }
    const message = error instanceof Error ? error.message : 'Photo details could not be saved.';
    return Response.json({error: message}, {status: 500});
  }
}
