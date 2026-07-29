const SUPABASE_URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const SUPABASE_PUBLISHABLE_KEY = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env[SUPABASE_URL_KEY] && process.env[SUPABASE_PUBLISHABLE_KEY]);
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env[SUPABASE_URL_KEY];
  const publishableKey = process.env[SUPABASE_PUBLISHABLE_KEY];

  if (!url || !publishableKey) {
    throw new Error(`Missing ${SUPABASE_URL_KEY} or ${SUPABASE_PUBLISHABLE_KEY}.`);
  }

  return {url, publishableKey};
}
