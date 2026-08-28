import 'server-only';

import type {SupabaseClient} from '@supabase/supabase-js';
import {unstable_cache} from 'next/cache';
import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import {HISTORICAL_STATS_CACHE_TAG} from '@/core/historicalStatsCacheTag';
import {loadServerHistoricalCiArchiveReplay} from '@/core/loadServerHistoricalCiArchiveReplay';
import {formatHistoricalCiReplayFailure} from '@/services/statistics/HistoricalCiReplayDiagnostic';
import {selectHistoricalCiReplaySummaries} from '@/services/statistics/HistoricalCiReplaySelection';
import {
  playerSeasonCiKey,
  summarizeHistoricalCiLedger,
  type HistoricalCiLedgerFact,
  type HistoricalCiLedgerSummary,
  type HistoricalTeamMatchOrder,
} from '@/services/statistics/HistoricalCiLedgerSummary';

export type HistoricalCiGainBreakdown = HistoricalCiLedgerSummary;

type HistoricalCiFactRow = {
  matchup_deduplication_key: string;
  season_id: string;
  player_id: string;
  historical_team_match_id: number | null;
  format: 'Singles' | 'Doubles';
  clash_index_before: number;
  ci_delta: number;
};

type HistoricalMatchupOrderRow = {
  deduplication_key: string;
  historical_team_match_id: number | null;
  event_order: number;
};

type HistoricalCiFactLoadResult =
  | {rows: HistoricalCiFactRow[]}
  | {fallbackReason: string};

type HistoricalTeamMatchOrderResult =
  | {orders: HistoricalTeamMatchOrder[]}
  | {fallbackReason: string};

const PAGE_SIZE = 1000;

/**
 * Prefer the immutable historical CI ledger for public Stats. The normal path
 * uses only public read policies and never requires the service-role key.
 * Deterministic replay remains the correctness fallback. Every fallback is
 * logged with its reason so a ledger defect cannot silently restore the
 * expensive request-time replay path.
 */
export async function loadServerHistoricalCiGains(seasonId?: string): Promise<Map<string, HistoricalCiGainBreakdown>> {
  const [factLoad, sourceRows] = await Promise.all([
    loadCachedHistoricalCiFacts(seasonId),
    loadCachedHistoricalMatchupOrders(seasonId),
  ]);

  if ('fallbackReason' in factLoad) {
    return loadHistoricalCiGainsFromReplay(factLoad.fallbackReason, seasonId);
  }

  if (!factLoad.rows.length) {
    return loadHistoricalCiGainsFromReplay('historical CI ledger contains no facts', seasonId);
  }
  if (factLoad.rows.length !== sourceRows.length) {
    return loadHistoricalCiGainsFromReplay(
      `historical CI ledger/source count mismatch: ${factLoad.rows.length} facts vs ${sourceRows.length} matchup rows`,
      seasonId,
    );
  }

  const missingFactTeamMatch = factLoad.rows.find((row) => row.historical_team_match_id === null);
  if (missingFactTeamMatch) {
    return loadHistoricalCiGainsFromReplay(
      `historical CI fact ${missingFactTeamMatch.matchup_deduplication_key} is missing a team-match id`,
      seasonId,
    );
  }

  const orderResult = buildHistoricalTeamMatchOrders(sourceRows);
  if ('fallbackReason' in orderResult) {
    return loadHistoricalCiGainsFromReplay(orderResult.fallbackReason, seasonId);
  }

  const facts = factLoad.rows.map((row): HistoricalCiLedgerFact => ({
    seasonId: row.season_id,
    playerId: row.player_id,
    historicalTeamMatchId: row.historical_team_match_id as number,
    format: row.format,
    clashIndexBefore: row.clash_index_before,
    ciDelta: row.ci_delta,
  }));
  const validation = summarizeHistoricalCiLedger(facts, orderResult.orders);
  if (!validation.ok) return loadHistoricalCiGainsFromReplay(validation.reason, seasonId);
  return validation.summaries;
}

const loadCachedHistoricalCiFacts = unstable_cache(
  async (seasonId?: string) => loadAllHistoricalCiFacts(await createHistoricalStatsReadClient(), seasonId),
  ['historical-ci-facts-v1'],
  {revalidate: 3600, tags: [HISTORICAL_STATS_CACHE_TAG]},
);

const loadCachedHistoricalMatchupOrders = unstable_cache(
  async (seasonId?: string) => loadAllHistoricalMatchupOrders(await createHistoricalStatsReadClient(), seasonId),
  ['historical-matchup-orders-v1'],
  {revalidate: 3600, tags: [HISTORICAL_STATS_CACHE_TAG]},
);

async function loadAllHistoricalCiFacts(
  supabase: SupabaseClient,
  seasonId?: string,
): Promise<HistoricalCiFactLoadResult> {
  const rows: HistoricalCiFactRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('historical_clash_contest_rating_facts')
      .select('matchup_deduplication_key,season_id,player_id,historical_team_match_id,format,clash_index_before,ci_delta')
      .order('matchup_deduplication_key', {ascending: true});
    if (seasonId) query = query.eq('season_id', seasonId);
    const {data, error} = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (isMissingHistoricalLedger(error)) {
        return {
          fallbackReason: `historical CI ledger unavailable (${error.code ?? 'unknown error code'})`,
        };
      }
      throw error;
    }

    const page = (data ?? []) as HistoricalCiFactRow[];
    if (page.length === 0) return {rows};
    rows.push(...page);
    from += page.length;
  }
}

async function loadAllHistoricalMatchupOrders(
  supabase: SupabaseClient,
  seasonId?: string,
): Promise<HistoricalMatchupOrderRow[]> {
  const rows: HistoricalMatchupOrderRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('historical_player_matchups')
      .select('deduplication_key,historical_team_match_id,event_order')
      .order('deduplication_key', {ascending: true});
    if (seasonId) query = query.eq('season_id', seasonId);
    const {data, error} = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data ?? []) as HistoricalMatchupOrderRow[];
    if (page.length === 0) return rows;
    rows.push(...page);
    from += page.length;
  }
}

function buildHistoricalTeamMatchOrders(
  rows: HistoricalMatchupOrderRow[],
): HistoricalTeamMatchOrderResult {
  const eventOrderByTeamMatchId = new Map<number, number>();
  for (const row of rows) {
    if (row.historical_team_match_id === null) {
      return {
        fallbackReason: `historical matchup ${row.deduplication_key} is missing a team-match id`,
      };
    }
    const existing = eventOrderByTeamMatchId.get(row.historical_team_match_id);
    if (existing !== undefined && existing !== row.event_order) {
      return {
        fallbackReason: `historical team match ${row.historical_team_match_id} has conflicting event orders: ${existing} vs ${row.event_order}`,
      };
    }
    eventOrderByTeamMatchId.set(row.historical_team_match_id, row.event_order);
  }
  return {
    orders: [...eventOrderByTeamMatchId].map(([id, eventOrder]) => ({id, eventOrder})),
  };
}

async function loadHistoricalCiGainsFromReplay(
  reason: string,
  requestedSeasonId?: string,
): Promise<Map<string, HistoricalCiGainBreakdown>> {
  console.warn('[stats] Historical CI ledger fallback to deterministic replay', {reason});

  let replay: Awaited<ReturnType<typeof loadServerHistoricalCiArchiveReplay>>;
  try {
    replay = await loadServerHistoricalCiArchiveReplay();
  } catch (error) {
    const diagnostic = formatHistoricalCiReplayFailure(reason, error);
    console.error('[stats] Historical CI replay fallback unavailable', {
      reason,
      replayError: error instanceof Error ? error.message : String(error),
    });
    throw new Error(diagnostic);
  }

  return selectHistoricalCiReplaySummaries(replay.seasons, requestedSeasonId);
}

export {playerSeasonCiKey};

function isMissingHistoricalLedger(error: {code?: string; message?: string}): boolean {
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || Boolean(error.message?.includes('historical_clash_contest_rating_facts'));
}
