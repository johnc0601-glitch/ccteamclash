import {createBrowserClient} from '@supabase/ssr';
import {getSupabaseConfig} from '@/lib/supabase/config';
import type {Database} from '@/lib/supabase/database.current';

export function createClient() {
  const {url, publishableKey} = getSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
