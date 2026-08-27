import 'server-only';

import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import type {HistoricalStatsMatchupRowInput} from '@/services/stats/StatsPageModel';

const PAGE_SIZE = 1000;

export async function loadServerHistoricalStatsRows(): Promise<HistoricalStatsMatchupRowInput[]> {
  const supabase = await createHistoricalStatsReadClient();
  const rows: HistoricalStatsMatchupRowInput[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const {data, error} = await supabase
      .from('historical_player_matchups')
      .select('deduplication_key,season_id,season_name,match_format,player_id,player_name,player_team_name,outcome')
      .order('season_id', {ascending: true})
      .order('deduplication_key', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data ?? []) as HistoricalStatsMatchupRowInput[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}
