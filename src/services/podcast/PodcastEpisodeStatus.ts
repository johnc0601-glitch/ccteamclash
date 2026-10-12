import 'server-only';
import {unstable_cache} from 'next/cache';
import {createPublicClient} from '@/lib/supabase/public';

export const PODCAST_NEW_EPISODE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const getCachedPodcastEpisodeAt = unstable_cache(
  async (): Promise<string | null> => {
    // Always use the cookie-free public client: this status is public on every page.
    const db = createPublicClient() as any;
    const {data, error} = await db
      .from('launch_podcast_status')
      .select('new_episode_at')
      .eq('id', 'clash-cast')
      .maybeSingle();

    if (error) {
      console.error('[podcast] Could not read latest episode status.', error);
      return null;
    }
    return typeof data?.new_episode_at === 'string' ? data.new_episode_at : null;
  },
  ['clash-cast-new-episode-at-v1'],
  {revalidate: 60, tags: ['podcast:status']},
);

export function isPodcastEpisodeNew(markedAt: string | null, now = Date.now()): boolean {
  if (!markedAt) return false;
  const started = Date.parse(markedAt);
  return Number.isFinite(started) &&
    started <= now &&
    now - started < PODCAST_NEW_EPISODE_DURATION_MS;
}

export async function getPodcastEpisodeAt(): Promise<string | null> {
  return getCachedPodcastEpisodeAt();
}
