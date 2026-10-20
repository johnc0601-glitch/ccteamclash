import 'server-only';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';
import {StoryAccessError} from '@/services/stories/StoryEditorAccess';

/** Dedicated podcast editor permission; no broader Office access. */
export async function requireClashCastEditor() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) throw new StoryAccessError('Sign in to manage Clash Cast.', 401);
  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);
  if (!profile || profile.status !== 'Approved') {
    throw new StoryAccessError('Approved account required.', 403);
  }
  if (profile.role !== 'Commissioner') {
    // RLS permits only the currently logged-in user's own grant to be read.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data: grant, error} = await (supabase as any)
      .from('clash_cast_editors').select('profile_id')
      .eq('profile_id', profile.id).maybeSingle();
    if (error || !grant) throw new StoryAccessError('Clash Cast editing access required.', 403);
  }
  return {supabase, profile};
}
