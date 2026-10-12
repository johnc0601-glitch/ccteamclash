import 'server-only';
import {unstable_cache} from 'next/cache';
import {createPublicClient} from '@/lib/supabase/public';

export const PODCAST_NEW_EPISODE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type PodcastEpisodeStatus = {
  newEpisodeAt: string | null;
  latestEpisodeTitle: string | null;
  latestEpisodeUrl: string | null;
};

const EMPTY_STATUS: PodcastEpisodeStatus = {
  newEpisodeAt: null,
  latestEpisodeTitle: null,
  latestEpisodeUrl: null,
};

const getCachedPodcastStatus = unstable_cache(
  async (): Promise<PodcastEpisodeStatus> => {
    // Public, cookie-free read: the header appears throughout the site.
    const db = createPublicClient() as any;
    const {data, error} = await db
      .from('launch_podcast_status')
      .select('new_episode_at,latest_episode_title,latest_episode_url')
      .eq('id', 'clash-cast')
      .maybeSingle();

    if (error) {
      console.error('[podcast] Could not read latest episode status.', error);
      return EMPTY_STATUS;
    }

    return {
      newEpisodeAt: typeof data?.new_episode_at === 'string' ? data.new_episode_at : null,
      latestEpisodeTitle: typeof data?.latest_episode_title === 'string' && data.latest_episode_title.trim()
        ? data.latest_episode_title.trim() : null,
      latestEpisodeUrl: typeof data?.latest_episode_url === 'string' &&
        /^https:\/\/open\.spotify\.com\/episode\/[a-zA-Z0-9]+(?:\?[^\s]*)?$/.test(data.latest_episode_url)
        ? data.latest_episode_url : null,
    };
  },
  ['clash-cast-podcast-status-v2'],
  {revalidate: 60, tags: ['podcast:status']},
);

export function isPodcastEpisodeNew(markedAt: string | null, now = Date.now()): boolean {
  if (!markedAt) return false;
  const started = Date.parse(markedAt);
  return Number.isFinite(started) &&
    started <= now &&
    now - started < PODCAST_NEW_EPISODE_DURATION_MS;
}

export async function getPodcastStatus(): Promise<PodcastEpisodeStatus> {
  return getCachedPodcastStatus();
}

export async function getPodcastEpisodeAt(): Promise<string | null> {
  return (await getPodcastStatus()).newEpisodeAt;
}
