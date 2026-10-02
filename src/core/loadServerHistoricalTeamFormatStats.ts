import 'server-only';

import type {SupabaseClient} from '@supabase/supabase-js';
import {unstable_cache} from 'next/cache';
import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import {HISTORICAL_STATS_CACHE_TAG} from '@/core/historicalStatsCacheTag';
import type {
  RecordSummary,
  TeamFormatStatistics,
} from '@/services/statistics/StatisticsTypes';

type HistoricalContestFactRow = {
  contest_id: string;
  season_id: string;
  team_id: string;
  format: 'Singles' | 'Doubles';
  outcome: 'W' | 'L' | 'T';
};

const PAGE_SIZE = 1000;

export async function loadServerHistoricalTeamFormatStats(
  seasonId: string,
  teamIds: string[],
): Promise<Map<string, TeamFormatStatistics>> {
  const normalizedTeamIds = [...new Set(teamIds)].sort();
  if (!normalizedTeamIds.length) return new Map();

  const rows = await loadCachedHistoricalTeamContestFacts(seasonId, normalizedTeamIds);
  return summarizeHistoricalTeamFormatStats(seasonId, normalizedTeamIds, rows);
}

const loadCachedHistoricalTeamContestFacts = unstable_cache(
  async (seasonId: string, teamIds: string[]) =>
    loadHistoricalTeamContestFacts(
      await createHistoricalStatsReadClient(),
      seasonId,
      teamIds,
    ),
  ['historical-team-format-stats-v1'],
  {revalidate: 3600, tags: [HISTORICAL_STATS_CACHE_TAG]},
);

async function loadHistoricalTeamContestFacts(
  supabase: SupabaseClient,
  seasonId: string,
  teamIds: string[],
): Promise<HistoricalContestFactRow[]> {
  const rows: HistoricalContestFactRow[] = [];
  let from = 0;

  while (true) {
    const {data, error} = await supabase
      .from('historical_clash_contest_rating_facts')
      .select('contest_id,season_id,team_id,format,outcome')
      .eq('season_id', seasonId)
      .in('team_id', teamIds)
      .order('contest_id', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as HistoricalContestFactRow[];
    if (!page.length) return rows;
    rows.push(...page);
    from += page.length;
    if (page.length < PAGE_SIZE) return rows;
  }
}

export function summarizeHistoricalTeamFormatStats(
  seasonId: string,
  teamIds: string[],
  rows: HistoricalContestFactRow[],
): Map<string, TeamFormatStatistics> {
  const uniqueContests = new Map<string, HistoricalContestFactRow>();

  for (const row of rows) {
    const key = `${row.contest_id}:${row.team_id}`;
    const existing = uniqueContests.get(key);
    if (existing) {
      if (existing.format !== row.format || existing.outcome !== row.outcome) {
        throw new Error(
          `Historical contest ${row.contest_id} has conflicting team results for ${row.team_id}.`,
        );
      }
      continue;
    }
    uniqueContests.set(key, row);
  }

  const result = new Map<string, TeamFormatStatistics>();
  for (const teamId of teamIds) {
    result.set(teamId, {
      teamId,
      seasonId,
      singlesRecord: emptyRecord(),
      doublesRecord: emptyRecord(),
      singlesWinPercentage: 0,
      doublesWinPercentage: 0,
    });
  }

  for (const row of uniqueContests.values()) {
    const stats = result.get(row.team_id);
    if (!stats) continue;

    const record = row.format === 'Singles'
      ? stats.singlesRecord
      : stats.doublesRecord;

    if (row.outcome === 'W') record.wins += 1;
    else if (row.outcome === 'L') record.losses += 1;
    else record.ties += 1;
  }

  for (const stats of result.values()) {
    stats.singlesWinPercentage = winPercentage(stats.singlesRecord);
    stats.doublesWinPercentage = winPercentage(stats.doublesRecord);
  }

  return result;
}

function emptyRecord(): RecordSummary {
  return {wins: 0, losses: 0, ties: 0};
}

function winPercentage(record: RecordSummary): number {
  const total = record.wins + record.losses + record.ties;
  if (!total) return 0;
  return Math.round(
    ((record.wins + record.ties * 0.5) / total) * 1000,
  ) / 10;
}
