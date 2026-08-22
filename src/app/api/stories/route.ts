import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';
import {getStories, saveStories} from '@/services/stories/StoryService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const stories = await getStories();
  return Response.json({stories});
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return Response.json({error: 'Commissioner sign-in required.'}, {status: 401});

    const repository = new SupabaseLaunchRepository(supabase);
    const profile = await repository.getProfileByUserId(user.id);
    if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
      return Response.json({error: 'Commissioner access required.'}, {status: 403});
    }

    const payload = await request.json() as {stories?: unknown};
    const stories = await saveStories(Array.isArray(payload.stories) ? payload.stories : []);
    return Response.json({stories});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stories could not be saved.';
    return Response.json({error: message}, {status: 400});
  }
}
