import 'server-only';

import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import type {HistoricalStatsMatchupRowInput} from '@/services/stats/StatsPageModel';

const PAGE_SIZE = 1000;

export async function loadServerHistoricalStatsRows(): Promise<HistoricalStatsMatchupRowInput[]> {
  const supabase = await createHistoricalStatsReadClient();
  const rows: HistoricalStatsMatchupRowInput[] = [];
  let from = 0;
  let expectedCount: number | null = null;

  while (true) {
    const {data, error, count} = await supabase
      .from('historical_player_matchups')
      .select(
        'deduplication_key,season_id,season_name,match_format,player_id,player_name,player_team_name,outcome',
        {count: 'exact'},
      )
      .order('season_id', {ascending: true})
      .order('deduplication_key', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (expectedCount === null && count !== null) expectedCount = count;

    const page = (data ?? []) as HistoricalStatsMatchupRowInput[];
    rows.push(...page);

    if (expectedCount !== null && rows.length >= expectedCount) return rows;
    if (page.length === 0) {
      if (expectedCount !== null && rows.length !== expectedCount) {
        throw new Error(`Historical Stats archive pagination ended early: loaded ${rows.length} of ${expectedCount} rows`);
      }
      return rows;
    }

    // Advance by what PostgREST actually returned. This remains correct even
    // when an API max-row limit is lower than PAGE_SIZE.
    from += page.length;
  }
}
