import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';
import {StoryValidationError, createStory, getManagedStories} from '@/services/stories/StoryService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStoryCommissioner();
    const stories = await getManagedStories();
    return Response.json({stories});
  } catch (error) {
    return storyErrorResponse(error, 'Stories could not be loaded.');
  }
}

export async function POST(request: Request) {
  try {
    const {profile} = await requireStoryCommissioner();
    const payload = await request.json() as {story?: unknown};
    const story = await createStory(payload.story, profile.id);
    return Response.json({story}, {status: 201});
  } catch (error) {
    return storyErrorResponse(error, 'Story could not be created.');
  }
}

function storyErrorResponse(error: unknown, fallback: string) {
  if (error instanceof StoryAccessError) {
    return Response.json({error: error.message}, {status: error.status});
  }
  if (error instanceof StoryValidationError) {
    return Response.json({error: error.message}, {status: 400});
  }

  const message = error instanceof Error ? error.message : fallback;
  return Response.json({error: message}, {status: 500});
}
