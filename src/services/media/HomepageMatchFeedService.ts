import {createClient} from '@/lib/supabase/server';

export type HomepageMatchFeedPreview = {
  author: string;
  excerpt: string;
  imageUrl: string | null;
  commentCount: number;
  reactionCount: number;
};

export async function getHomepageMatchFeedPreviews(matchIds: string[]): Promise<Map<string, HomepageMatchFeedPreview>> {
  const previews = new Map<string, HomepageMatchFeedPreview>();
  const uniqueMatchIds = [...new Set(matchIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueMatchIds.length === 0) return previews;

  try {
    const supabase = await createClient();
    const db = supabase as any;
    const {data, error} = await db
      .from('launch_homepage_match_feed_previews')
      .select('match_id,author_name_snapshot,body,image_path,comment_count,reaction_count')
      .in('match_id', uniqueMatchIds);

    if (error) throw error;

    for (const row of data ?? []) {
      const matchId = typeof row.match_id === 'string' ? row.match_id : '';
      if (!matchId) continue;
      const imagePath = typeof row.image_path === 'string' ? row.image_path : '';
      const imageUrl = imagePath
        ? supabase.storage.from('match-feed').getPublicUrl(imagePath).data.publicUrl
        : null;

      previews.set(matchId, {
        author: clean(row.author_name_snapshot) || 'Member',
        excerpt: clean(row.body).slice(0, 140),
        imageUrl,
        commentCount: safeCount(row.comment_count),
        reactionCount: safeCount(row.reaction_count),
      });
    }
  } catch (error) {
    console.error('[media] Homepage Matchday previews could not be loaded.', error);
  }

  return previews;
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}
