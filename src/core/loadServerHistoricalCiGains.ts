import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';

type HistoricalMatchupKeyRow = {
  season_id: string;
  player_id: string;
  deduplication_key: string;
};

type HistoricalCiFactRow = {
  season_id: string;
  player_id: string;
  matchup_deduplication_key: string;
  format: 'Singles' | 'Doubles';
  ci_delta: number;
};

export type HistoricalCiGainBreakdown = {
  ciGain: number;
  singlesCiGain: number;
  doublesCiGain: number;
};

/**
 * Returns season/player CI gain only when every imported historical matchup for
 * that player/season has an immutable CI fact. Total, Singles and Doubles stay
 * unavailable together if the season is incomplete so Stats never exposes a
 * partial historical subtotal as if it were final.
 *
 * During staged rollout the historical ledger migration may not exist yet. In
 * that specific case return no gains instead of taking the public Stats page
 * down; all other database errors remain visible.
 */
export async function loadServerHistoricalCiGains(): Promise<Map<string, HistoricalCiGainBreakdown>> {
  const supabase = await createClient();
  const untyped = supabase as unknown as SupabaseClient;
  const [matchupResult, factResult] = await Promise.all([
    supabase
      .from('historical_player_matchups')
      .select('season_id,player_id,deduplication_key'),
    untyped
      .from('historical_clash_contest_rating_facts')
      .select('season_id,player_id,matchup_deduplication_key,format,ci_delta'),
  ]);
  if (matchupResult.error) throw matchupResult.error;
  if (factResult.error) {
    if (isMissingHistoricalLedger(factResult.error)) return new Map();
    throw factResult.error;
  }

  const matchups = (matchupResult.data ?? []) as HistoricalMatchupKeyRow[];
  const facts = (factResult.data ?? []) as HistoricalCiFactRow[];
  const sourceKeysByPlayerSeason = new Map<string, Set<string>>();
  const factsByPlayerSeason = new Map<string, HistoricalCiFactRow[]>();

  for (const row of matchups) {
    const key = playerSeasonKey(row.season_id, row.player_id);
    const sourceKeys = sourceKeysByPlayerSeason.get(key) ?? new Set<string>();
    sourceKeys.add(row.deduplication_key);
    sourceKeysByPlayerSeason.set(key, sourceKeys);
  }
  for (const fact of facts) {
    const key = playerSeasonKey(fact.season_id, fact.player_id);
    const rows = factsByPlayerSeason.get(key) ?? [];
    rows.push(fact);
    factsByPlayerSeason.set(key, rows);
  }

  const gains = new Map<string, HistoricalCiGainBreakdown>();
  for (const [key, sourceKeys] of sourceKeysByPlayerSeason) {
    const playerFacts = factsByPlayerSeason.get(key) ?? [];
    const factKeys = new Set(playerFacts.map((fact) => fact.matchup_deduplication_key));
    if (factKeys.size !== sourceKeys.size || [...sourceKeys].some((sourceKey) => !factKeys.has(sourceKey))) {
      continue;
    }
    let singlesCiGain = 0;
    let doublesCiGain = 0;
    for (const fact of playerFacts) {
      if (fact.format === 'Singles') singlesCiGain += fact.ci_delta;
      else doublesCiGain += fact.ci_delta;
    }
    gains.set(key, {
      ciGain: singlesCiGain + doublesCiGain,
      singlesCiGain,
      doublesCiGain,
    });
  }
  return gains;
}

export function playerSeasonCiKey(seasonId: string, playerId: string): string {
  return playerSeasonKey(seasonId, playerId);
}

function playerSeasonKey(seasonId: string, playerId: string): string {
  return `${seasonId}:${playerId}`;
}

function isMissingHistoricalLedger(error: {code?: string; message?: string}): boolean {
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || Boolean(error.message?.includes('historical_clash_contest_rating_facts'));
}
