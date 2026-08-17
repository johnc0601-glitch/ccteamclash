import type {SupabaseClient, User} from '@supabase/supabase-js';
import {ensureLaunchSignupProfile} from '@/domain/launch/LaunchAccountSetup';
import type {Database} from '@/lib/supabase/database';

type CallbackSupabaseClient = SupabaseClient<Database>;
type ProfileSetup = (supabase: CallbackSupabaseClient, user: User) => Promise<string | null>;

export type AuthCallbackCompletion =
  | {ok: true; user: User | null}
  | {ok: false; message: string; stage: 'exchange' | 'profile'};

export async function completeAuthCallback(
  supabase: CallbackSupabaseClient,
  code: string,
  setupProfile: ProfileSetup = ensureLaunchSignupProfile,
): Promise<AuthCallbackCompletion> {
  const {error} = await supabase.auth.exchangeCodeForSession(code);
  if (error) return {ok: false, message: error.message, stage: 'exchange'};

  const {data} = await supabase.auth.getUser();
  if (!data.user) return {ok: true, user: null};

  const setupError = await setupProfile(supabase, data.user);
  if (setupError) return {ok: false, message: setupError, stage: 'profile'};

  return {ok: true, user: data.user};
}
