import 'server-only';

import type {SupabaseClient} from '@supabase/supabase-js';
import {loadServerHistoricalCiArchiveReplay} from '@/core/loadServerHistoricalCiArchiveReplay';
import {createAdminClient} from '@/lib/supabase/admin';
import {
  playerSeasonCiKey,
  summarizeHistoricalCiLedger,
  type HistoricalCiLedgerFact,
  type HistoricalCiLedgerSummary,
  type HistoricalTeamMatchOrder,
} from '@/services/statistics/HistoricalCiLedgerSummary';

export type HistoricalCiGainBreakdown = HistoricalCiLedgerSummary;

type HistoricalCiFactRow = {
  season_id: string;
  player_id: string;
  historical_team_match_id: number;
  format: 'Singles' | 'Doubles';
  clash_index_before: number;
  ci_delta: number;
};

type HistoricalTeamMatchOrderRow = {
  id: number;
  event_order: number;
};

type HistoricalCiFactLoadResult =
  | {rows: HistoricalCiFactRow[]}
  | {fallbackReason: string};

const PAGE_SIZE = 1000;

/**
 * Prefer the immutable historical CI ledger for public Stats. The ledger is
 * persisted directly from deterministic archive replay. If it is missing,
 * incomplete, or internally discontinuous, fall back to replay so correctness
 * always wins over performance. Every fallback is logged with its reason so a
 * ledger defect cannot silently restore the expensive request-time replay path.
 */
export async function loadServerHistoricalCiGains(): Promise<Map<string, HistoricalCiGainBreakdown>> {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const [factLoad, teamMatchResult, sourceCountResult] = await Promise.all([
    loadAllHistoricalCiFacts(admin),
    admin
      .from('historical_team_matches')
      .select('id,event_order'),
    admin
      .from('historical_player_matchups')
      .select('deduplication_key', {count: 'exact', head: true}),
  ]);

  if ('fallbackReason' in factLoad) {
    return loadHistoricalCiGainsFromReplay(factLoad.fallbackReason);
  }
  if (teamMatchResult.error) throw teamMatchResult.error;
  if (sourceCountResult.error) throw sourceCountResult.error;

  const facts = factLoad.rows.map((row): HistoricalCiLedgerFact => ({
    seasonId: row.season_id,
    playerId: row.player_id,
    historicalTeamMatchId: row.historical_team_match_id,
    format: row.format,
    clashIndexBefore: row.clash_index_before,
    ciDelta: row.ci_delta,
  }));
  const sourceCount = sourceCountResult.count ?? 0;
  if (!facts.length) {
    return loadHistoricalCiGainsFromReplay('historical CI ledger contains no facts');
  }
  if (facts.length !== sourceCount) {
    return loadHistoricalCiGainsFromReplay(
      `historical CI ledger/source count mismatch: ${facts.length} facts vs ${sourceCount} matchup rows`,
    );
  }

  const teamMatches = ((teamMatchResult.data ?? []) as HistoricalTeamMatchOrderRow[])
    .map((row): HistoricalTeamMatchOrder => ({id: row.id, eventOrder: row.event_order}));
  const validation = summarizeHistoricalCiLedger(facts, teamMatches);
  if (!validation.ok) return loadHistoricalCiGainsFromReplay(validation.reason);
  return validation.summaries;
}

async function loadAllHistoricalCiFacts(
  admin: SupabaseClient,
): Promise<HistoricalCiFactLoadResult> {
  const rows: HistoricalCiFactRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const {data, error} = await admin
      .from('historical_clash_contest_rating_facts')
      .select('season_id,player_id,historical_team_match_id,format,clash_index_before,ci_delta')
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
    const page = (data ?? []) as HistoricalCiFactRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return {rows};
  }
}

async function loadHistoricalCiGainsFromReplay(
  reason: string,
): Promise<Map<string, HistoricalCiGainBreakdown>> {
  console.warn('[stats] Historical CI ledger fallback to deterministic replay', {reason});
  const replay = await loadServerHistoricalCiArchiveReplay();
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
