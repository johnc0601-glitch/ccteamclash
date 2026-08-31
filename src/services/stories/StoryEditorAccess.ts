import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export async function requireStoryCommissioner() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) {
    throw new StoryAccessError('Commissioner sign-in required.', 401);
  }

  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);
  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    throw new StoryAccessError('Commissioner access required.', 403);
  }

  return {supabase, profile};
}

export class StoryAccessError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'StoryAccessError';
  }
}
