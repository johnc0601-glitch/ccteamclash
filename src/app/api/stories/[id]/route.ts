import {revalidatePath, revalidateTag} from 'next/cache';
import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';
import {enqueuePublishedStoryNotifications} from '@/services/notifications/NotificationOutboxService';
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
    const {profile, supabase} = await requireStoryCommissioner();
    const {id} = await params;
    const payload = await request.json() as {story?: unknown; revision?: unknown};
    const revision = parseRevision(payload.revision);
    const {data: currentStory} = await (supabase as any)
      .from('launch_stories')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    const story = await updateStory(id, revision, payload.story, profile.id);
    if (currentStory?.status !== 'published' && story.status === 'published') {
      try {
        await enqueuePublishedStoryNotifications({
          storyId: story.id,
          slug: story.slug,
          title: story.title,
          category: story.category,
          authorProfileId: profile.id,
        });
      } catch (notificationError) {
        console.error('Published story notification could not be queued.', {
          storyId: story.id,
          error: notificationError,
        });
      }
    }
    invalidatePublicStories(story.slug);
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
    invalidatePublicStories(story.slug);
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


function invalidatePublicStories(slug?: string): void {
  revalidateTag('public:stories', 'max');
  revalidateTag('public:homepage', 'max');
  revalidatePath('/');
  revalidatePath('/stories');
  if (slug) revalidatePath(`/stories/${encodeURIComponent(slug)}`);
}
