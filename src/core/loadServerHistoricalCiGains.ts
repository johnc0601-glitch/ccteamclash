import 'server-only';

import type {SupabaseClient} from '@supabase/supabase-js';
import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import {loadServerHistoricalCiArchiveReplay} from '@/core/loadServerHistoricalCiArchiveReplay';
import {formatHistoricalCiReplayFailure} from '@/services/statistics/HistoricalCiReplayDiagnostic';
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
export async function loadServerHistoricalCiGains(): Promise<Map<string, HistoricalCiGainBreakdown>> {
  const client = await createHistoricalStatsReadClient();
  const [factLoad, sourceRows] = await Promise.all([
    loadAllHistoricalCiFacts(client),
    loadAllHistoricalMatchupOrders(client),
  ]);

  if ('fallbackReason' in factLoad) {
    return loadHistoricalCiGainsFromReplay(factLoad.fallbackReason);
  }

  if (!factLoad.rows.length) {
    return loadHistoricalCiGainsFromReplay('historical CI ledger contains no facts');
  }
  if (factLoad.rows.length !== sourceRows.length) {
    return loadHistoricalCiGainsFromReplay(
      `historical CI ledger/source count mismatch: ${factLoad.rows.length} facts vs ${sourceRows.length} matchup rows`,
    );
  }

  const missingFactTeamMatch = factLoad.rows.find((row) => row.historical_team_match_id === null);
  if (missingFactTeamMatch) {
    return loadHistoricalCiGainsFromReplay(
      `historical CI fact ${missingFactTeamMatch.matchup_deduplication_key} is missing a team-match id`,
    );
  }

  const orderResult = buildHistoricalTeamMatchOrders(sourceRows);
  if ('fallbackReason' in orderResult) {
    return loadHistoricalCiGainsFromReplay(orderResult.fallbackReason);
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
  if (!validation.ok) return loadHistoricalCiGainsFromReplay(validation.reason);
  return validation.summaries;
}

async function loadAllHistoricalCiFacts(
  supabase: SupabaseClient,
): Promise<HistoricalCiFactLoadResult> {
  const rows: HistoricalCiFactRow[] = [];
  let from = 0;
  let expectedCount: number | null = null;

  while (true) {
    const {data, error, count} = await supabase
      .from('historical_clash_contest_rating_facts')
      .select(
        'matchup_deduplication_key,season_id,player_id,historical_team_match_id,format,clash_index_before,ci_delta',
        {count: 'exact'},
      )
      .order('matchup_deduplication_key', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (isMissingHistoricalLedger(error)) {
        return {
          fallbackReason: `historical CI ledger unavailable (${error.code ?? 'unknown error code'})`,
        };
      }
      throw error;
    }

    if (expectedCount === null && count !== null) expectedCount = count;
    const page = (data ?? []) as HistoricalCiFactRow[];
    rows.push(...page);

    if (expectedCount !== null && rows.length >= expectedCount) return {rows};
    if (page.length === 0) {
      if (expectedCount !== null && rows.length !== expectedCount) {
        return {fallbackReason: `historical CI ledger pagination ended early: loaded ${rows.length} of ${expectedCount} facts`};
      }
      return {rows};
    }
    from += page.length;
  }
}

async function loadAllHistoricalMatchupOrders(
  supabase: SupabaseClient,
): Promise<HistoricalMatchupOrderRow[]> {
  const rows: HistoricalMatchupOrderRow[] = [];
  let from = 0;
  let expectedCount: number | null = null;

  while (true) {
    const {data, error, count} = await supabase
      .from('historical_player_matchups')
      .select('deduplication_key,historical_team_match_id,event_order', {count: 'exact'})
      .order('deduplication_key', {ascending: true})
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    if (expectedCount === null && count !== null) expectedCount = count;
    const page = (data ?? []) as HistoricalMatchupOrderRow[];
    rows.push(...page);

    if (expectedCount !== null && rows.length >= expectedCount) return rows;
    if (page.length === 0) {
      if (expectedCount !== null && rows.length !== expectedCount) {
        throw new Error(`Historical matchup pagination ended early: loaded ${rows.length} of ${expectedCount} rows`);
      }
      return rows;
    }
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

  const gains = new Map<string, HistoricalCiGainBreakdown>();

  for (const [seasonId, season] of replay.seasons) {
    const splitByPlayer = new Map<string, {singlesCiGain: number; doublesCiGain: number}>();
    for (const fact of season.facts) {
      const split = splitByPlayer.get(fact.playerId) ?? {singlesCiGain: 0, doublesCiGain: 0};
      if (fact.format === 'Singles') split.singlesCiGain += fact.ciDelta;
      else split.doublesCiGain += fact.ciDelta;
      splitByPlayer.set(fact.playerId, split);
    }

    for (const [playerId, endingCi] of season.endingRatings) {
      const split = splitByPlayer.get(playerId) ?? {singlesCiGain: 0, doublesCiGain: 0};
      gains.set(playerSeasonCiKey(seasonId, playerId), {
        ciGain: split.singlesCiGain + split.doublesCiGain,
        singlesCiGain: split.singlesCiGain,
        doublesCiGain: split.doublesCiGain,
        endingCi,
      });
    }
  }

  return gains;
}

export {playerSeasonCiKey};

function isMissingHistoricalLedger(error: {code?: string; message?: string}): boolean {
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || Boolean(error.message?.includes('historical_clash_contest_rating_facts'));
}
