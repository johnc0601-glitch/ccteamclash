import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';
import {StoryConflictError, StoryValidationError} from '@/services/stories/StoryService';
import {featurePublishedStory} from '@/services/stories/HomepageFeatureService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {params: Promise<{id: string}>};

export async function POST(request: Request, {params}: RouteContext) {
  try {
    const {profile} = await requireStoryCommissioner();
    const {id} = await params;
    const payload = await request.json() as {revision?: unknown};
    const revision = parseRevision(payload.revision);
    const story = await featurePublishedStory(id, revision, profile.id);
    return Response.json({story});
  } catch (error) {
    if (error instanceof StoryAccessError) {
      return Response.json({error: error.message}, {status: error.status});
    }
    if (error instanceof StoryConflictError) {
      return Response.json({error: error.message}, {status: 409});
    }
    if (error instanceof StoryValidationError) {
      return Response.json({error: error.message}, {status: 400});
    }
    const message = error instanceof Error ? error.message : 'Story could not be featured.';
    return Response.json({error: message}, {status: 500});
  }
}

function parseRevision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new StoryValidationError('Reload this story before featuring it.');
  }
  return value;
}
