import 'server-only';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';
import {StoryAccessError} from '@/services/stories/StoryEditorAccess';

/** Check approved login and the single-purpose Pulse grant. Never use a service-role key. */
export async function requireClashPulseReader() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) throw new StoryAccessError('Sign in to view Clash Pulse research.', 401);

  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);
  if (!profile || profile.status !== 'Approved') {
    throw new StoryAccessError('An approved account is required.', 403);
  }
  const isCommissioner = profile.role === 'Commissioner';
  if (!isCommissioner) {
    // The Supabase RLS policy permits a user to read only their own grant.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data: grant, error} = await (supabase as any).from('clash_pulse_readers')
      .select('profile_id').eq('profile_id', profile.id).maybeSingle();
    if (error || !grant) throw new StoryAccessError('Clash Pulse access has not been granted to this account.', 403);
  }
  return {supabase, isCommissioner};
}
