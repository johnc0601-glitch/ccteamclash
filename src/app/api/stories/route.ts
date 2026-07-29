import {getStories, saveStories} from '@/services/stories/StoryService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const stories = await getStories();
  return Response.json({stories});
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as {stories?: unknown};
    const stories = await saveStories(Array.isArray(payload.stories) ? payload.stories : []);
    return Response.json({stories});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stories could not be saved.';
    return Response.json({error: message}, {status: 400});
  }
}
