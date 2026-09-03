import {createClient as createSupabaseClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '@/lib/supabase/config';
import type {Database} from '@/lib/supabase/database.current';

/**
 * Creates a cookie-free Supabase client for data that is explicitly public.
 *
 * Cached public reads must never inherit a visitor's authenticated session,
 * otherwise a commissioner/captain RLS result could be cached and reused for
 * anonymous visitors. This client always executes as the publishable/anon
 * role and therefore only sees rows allowed by public RLS policies.
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
