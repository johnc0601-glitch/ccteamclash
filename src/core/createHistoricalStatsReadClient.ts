import 'server-only';

import {createClient as createSupabaseClient, type SupabaseClient} from '@supabase/supabase-js';

// Preview deployments use the staging database for all live/application data.
// Historical Stats, however, must be compared against the immutable production
// archive. These are public/RLS-protected read credentials only; no production
// write path uses this client.
const PRODUCTION_STATS_URL = 'https://iwyssbrekhwkjnlagxzc.supabase.co';
const PRODUCTION_STATS_PUBLISHABLE_KEY = 'sb_publishable_rHkK5q8B0Dt75GQkR1vyCw_0zMPZkEi';

export async function createHistoricalStatsReadClient(): Promise<SupabaseClient> {
  // Historical Stats reads run inside Next.js' shared cache. Keep this client
  // request-independent: the SSR client reads cookies(), which is unavailable
  // inside unstable_cache and caused the production /stats route to return 500.
  return createSupabaseClient(PRODUCTION_STATS_URL, PRODUCTION_STATS_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
