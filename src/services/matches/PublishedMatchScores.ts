import 'server-only';
import {createPublicClient} from '@/lib/supabase/public';

export type PublishedMatchScore = {awayScore: number; homeScore: number};

export async function getPublishedMatchScores(matchIds: string[]): Promise<Map<string, PublishedMatchScore>> {
  const scores = new Map<string, PublishedMatchScore>();
  if (!matchIds.length) return scores;
  const {data, error} = await createPublicClient().from('launch_match_results')
    .select('match_id,away_score,home_score').eq('status', 'Published').in('match_id', matchIds);
  if (error) throw error;
  for (const row of data ?? []) {
    const awayScore = Number(row.away_score);
    const homeScore = Number(row.home_score);
    if (row.away_score != null && row.home_score != null && Number.isFinite(awayScore) && Number.isFinite(homeScore)
      && awayScore >= 0 && homeScore >= 0 && Number.isInteger(awayScore * 2) && Number.isInteger(homeScore * 2)) {
      scores.set(row.match_id, {awayScore, homeScore});
    }
  }
  return scores;
}
