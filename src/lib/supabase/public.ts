import 'server-only';

import {createClient as createSupabaseClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '@/lib/supabase/config';
import type {Database} from '@/lib/supabase/database.current';

/**
 * Cookie-free Supabase client for public, cacheable reads.
 *
 * Do not use this client for user-specific or privileged data. It always runs
 * with the publishable key and therefore sees only rows exposed by public RLS.
 */
export function createPublicClient() {
  const {url, publishableKey} = getSupabaseConfig();

  return createSupabaseClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
