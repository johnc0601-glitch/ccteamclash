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
  ci_delta: number;
};

/**
 * Returns season/player CI gain only when every imported historical matchup for
 * that player/season has an immutable CI fact. Partial backfills intentionally
 * remain absent so Stats renders an em dash instead of a misleading subtotal.
 */
export async function loadServerHistoricalCiGains(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const untyped = supabase as unknown as SupabaseClient;
  const [matchupResult, factResult] = await Promise.all([
    supabase
      .from('historical_player_matchups')
      .select('season_id,player_id,deduplication_key'),
    untyped
      .from('historical_clash_contest_rating_facts')
      .select('season_id,player_id,matchup_deduplication_key,ci_delta'),
  ]);
  if (matchupResult.error) throw matchupResult.error;
  if (factResult.error) throw factResult.error;

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

  const gains = new Map<string, number>();
  for (const [key, sourceKeys] of sourceKeysByPlayerSeason) {
    const playerFacts = factsByPlayerSeason.get(key) ?? [];
    const factKeys = new Set(playerFacts.map((fact) => fact.matchup_deduplication_key));
    if (factKeys.size !== sourceKeys.size || [...sourceKeys].some((sourceKey) => !factKeys.has(sourceKey))) {
      continue;
    }
    gains.set(key, playerFacts.reduce((total, fact) => total + fact.ci_delta, 0));
  }
  return gains;
}

export function playerSeasonCiKey(seasonId: string, playerId: string): string {
  return playerSeasonKey(seasonId, playerId);
}

function playerSeasonKey(seasonId: string, playerId: string): string {
  return `${seasonId}:${playerId}`;
}
