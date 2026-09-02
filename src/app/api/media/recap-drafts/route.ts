import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';
import {StoryValidationError} from '@/services/stories/StoryService';
import {createAroundTheClashRecapDraft} from '@/services/media/AroundTheClashRecapService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const {profile} = await requireStoryCommissioner();
    const payload = await request.json() as {factIds?: unknown};
    const story = await createAroundTheClashRecapDraft(payload.factIds, profile.id);
    return Response.json({story}, {status: 201});
  } catch (error) {
    if (error instanceof StoryAccessError) {
      return Response.json({error: error.message}, {status: error.status});
    }
    if (error instanceof StoryValidationError) {
      return Response.json({error: error.message}, {status: 400});
    }

    const message = error instanceof Error ? error.message : 'Recap draft could not be created.';
    return Response.json({error: message}, {status: 500});
  }
}
