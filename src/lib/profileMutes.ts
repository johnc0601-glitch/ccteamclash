import type {SupabaseClient} from '@supabase/supabase-js';

export async function getMutedProfileIds(
  supabase: SupabaseClient<any>,
  muterProfileId: string | null | undefined,
): Promise<Set<string>> {
  if (!muterProfileId) return new Set();

  const {data, error} = await (supabase as any)
    .from('launch_profile_mutes')
    .select('muted_profile_id')
    .eq('muter_profile_id', muterProfileId);

  if (error) {
    console.error('Member mute preferences could not be loaded.', {
      muterProfileId,
      error: error.message,
    });
    return new Set();
  }

  return new Set((data ?? []).map((row: {muted_profile_id: string}) => row.muted_profile_id));
}
