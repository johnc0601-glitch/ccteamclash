import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';
import {
  StoryConflictError,
  StoryValidationError,
  archiveStory,
  updateStory,
} from '@/services/stories/StoryService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: RouteContext) {
  try {
    const {profile} = await requireStoryCommissioner();
    const {id} = await params;
    const payload = await request.json() as {story?: unknown; revision?: unknown};
    const revision = parseRevision(payload.revision);
    const story = await updateStory(id, revision, payload.story, profile.id);
    return Response.json({story});
  } catch (error) {
    return storyErrorResponse(error, 'Story could not be saved.');
  }
}

export async function DELETE(request: Request, {params}: RouteContext) {
  try {
    const {profile} = await requireStoryCommissioner();
    const {id} = await params;
    const payload = await request.json() as {revision?: unknown};
    const revision = parseRevision(payload.revision);
    const story = await archiveStory(id, revision, profile.id);
    return Response.json({story});
  } catch (error) {
    return storyErrorResponse(error, 'Story could not be archived.');
  }
}

function parseRevision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new StoryValidationError('Reload this story before saving it.');
  }
  return value;
}

function storyErrorResponse(error: unknown, fallback: string) {
  if (error instanceof StoryAccessError) {
    return Response.json({error: error.message}, {status: error.status});
  }
  if (error instanceof StoryConflictError) {
    return Response.json({error: error.message}, {status: 409});
  }
  if (error instanceof StoryValidationError) {
    return Response.json({error: error.message}, {status: 400});
  }

  const message = error instanceof Error ? error.message : fallback;
  return Response.json({error: message}, {status: 500});
}
