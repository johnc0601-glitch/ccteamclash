import 'server-only';

import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import type {HistoricalStatsMatchupRowInput} from '@/services/stats/StatsPageModel';

const PAGE_SIZE = 1000;

export async function loadServerHistoricalStatsRows(): Promise<HistoricalStatsMatchupRowInput[]> {
  const supabase = await createHistoricalStatsReadClient();
  const rows: HistoricalStatsMatchupRowInput[] = [];
  let from = 0;

  while (true) {
    const {data, error} = await supabase
      .from('historical_player_matchups')
      .select('deduplication_key,season_id,season_name,match_format,player_id,player_name,player_team_name,outcome')
      .order('season_id', {ascending: true})
      .order('deduplication_key', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as HistoricalStatsMatchupRowInput[];
    if (page.length === 0) return rows;
    rows.push(...page);

    // Advance by what PostgREST actually returned. Do not infer completion
    // from page size or count metadata because API row caps can be lower than
    // the requested range and count metadata may itself be capped.
    from += page.length;
  }
}
