import 'server-only';

import {createClient as createSupabaseClient, type SupabaseClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '@/lib/supabase/config';

export async function createHistoricalStatsReadClient(): Promise<SupabaseClient> {
  // Keep Stats on the same environment-specific Supabase data source as the
  // rest of the app (see src/lib/supabase/server.ts), so preview/staging Stats
  // and live prediction inputs cannot silently diverge.
  //
  // Historical Stats reads run inside Next.js' shared cache. This client must
  // remain request-independent: the SSR client reads cookies(), which is
  // unavailable inside unstable_cache and previously caused /stats to return 500.
  const {url, publishableKey} = getSupabaseConfig();

  return createSupabaseClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
