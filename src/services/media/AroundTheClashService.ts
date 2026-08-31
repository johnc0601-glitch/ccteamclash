import {createClient} from '@/lib/supabase/server';

export type AroundFact = {
  id: string;
  seasonId: string;
  eventKey: string;
  eventOrder: number;
  eventLabel: string;
  matchId: string;
  contestId: string;
  playerId: string;
  playerName: string;
  format: string;
  side: string;
  outcome: string;
  ratingBefore: number;
  partnerPlayerId: string | null;
  partnerName: string | null;
  partnerRating: number | null;
  opponentOnePlayerId: string | null;
  opponentOneName: string | null;
  opponentOneRating: number | null;
  opponentTwoPlayerId: string | null;
  opponentTwoName: string | null;
  opponentTwoRating: number | null;
  ownPairRating: number | null;
  opponentPairRating: number | null;
  homeAdjustment: number;
  expectedScore: number;
  actualScore: number;
  totalDelta: number;
  calculatedAt: string;
};

export type AroundTheClashData = {
  facts: AroundFact[];
  activeSeasonId: string | null;
  seasonNames: Record<string, string>;
};

type LedgerRow = {
  id: number | string;
  season_id: string;
  event_key: string;
  event_order: number;
  event_label: string;
  source_key: string;
  source_contest_id: string;
  player_id: string;
  format: string;
  side: string;
  outcome: string;
  rating_before: number;
  partner_player_id: string | null;
  partner_rating: number | null;
  opponent_one_player_id: string | null;
  opponent_one_rating: number | null;
  opponent_two_player_id: string | null;
  opponent_two_rating: number | null;
  own_pair_rating: number | null;
  opponent_pair_rating: number | null;
  home_adjustment: number;
  expected_score: number;
  actual_score: number;
  total_delta: number;
  calculated_at: string;
};

const LEDGER_COLUMNS = [
  'id', 'season_id', 'event_key', 'event_order', 'event_label', 'source_key',
  'source_contest_id', 'player_id', 'format', 'side', 'outcome', 'rating_before',
  'partner_player_id', 'partner_rating', 'opponent_one_player_id', 'opponent_one_rating',
  'opponent_two_player_id', 'opponent_two_rating', 'own_pair_rating', 'opponent_pair_rating',
  'home_adjustment', 'expected_score', 'actual_score', 'total_delta', 'calculated_at',
].join(',');

export async function getAroundTheClashData(): Promise<AroundTheClashData> {
  const supabase = await createClient();
  const db = supabase as any;

  const [{data: ledger, error: ledgerError}, {data: seasons, error: seasonError}] = await Promise.all([
    db
      .from('clash_rating_ledger')
      .select(LEDGER_COLUMNS)
      .order('event_order', {ascending: false})
      .order('calculated_at', {ascending: false})
      .limit(5000),
    db
      .from('launch_seasons')
      .select('id,name,active,year')
      .order('year', {ascending: false}),
  ]);

  if (ledgerError) throw new Error(ledgerError.message || 'Clash rating facts could not be loaded.');
  if (seasonError) throw new Error(seasonError.message || 'Season context could not be loaded.');

  const rows = (ledger ?? []) as LedgerRow[];
  const playerIds = unique(rows.flatMap((row) => [
    row.player_id,
    row.partner_player_id,
    row.opponent_one_player_id,
    row.opponent_two_player_id,
  ]).filter((value): value is string => Boolean(value)));

  const playerNames = new Map<string, string>();
  if (playerIds.length) {
    const {data: players, error: playerError} = await db
      .from('launch_players')
      .select('id,name')
      .in('id', playerIds);
    if (playerError) throw new Error(playerError.message || 'Player names could not be loaded.');
    for (const player of players ?? []) {
      playerNames.set(String(player.id), cleanText(player.name) || String(player.id));
    }
  }

  const seasonNames: Record<string, string> = {};
  let activeSeasonId: string | null = null;
  for (const season of seasons ?? []) {
    const id = String(season.id);
    seasonNames[id] = cleanText(season.name) || id;
    if (!activeSeasonId && season.active === true) activeSeasonId = id;
  }

  return {
    activeSeasonId,
    seasonNames,
    facts: rows.map((row) => ({
      id: String(row.id),
      seasonId: row.season_id,
      eventKey: row.event_key,
      eventOrder: row.event_order,
      eventLabel: row.event_label,
      matchId: row.source_key,
      contestId: row.source_contest_id,
      playerId: row.player_id,
      playerName: playerNames.get(row.player_id) ?? row.player_id,
      format: row.format,
      side: row.side,
      outcome: row.outcome,
      ratingBefore: finite(row.rating_before),
      partnerPlayerId: row.partner_player_id,
      partnerName: row.partner_player_id ? (playerNames.get(row.partner_player_id) ?? row.partner_player_id) : null,
      partnerRating: nullableFinite(row.partner_rating),
      opponentOnePlayerId: row.opponent_one_player_id,
      opponentOneName: row.opponent_one_player_id ? (playerNames.get(row.opponent_one_player_id) ?? row.opponent_one_player_id) : null,
      opponentOneRating: nullableFinite(row.opponent_one_rating),
      opponentTwoPlayerId: row.opponent_two_player_id,
      opponentTwoName: row.opponent_two_player_id ? (playerNames.get(row.opponent_two_player_id) ?? row.opponent_two_player_id) : null,
      opponentTwoRating: nullableFinite(row.opponent_two_rating),
      ownPairRating: nullableFinite(row.own_pair_rating),
      opponentPairRating: nullableFinite(row.opponent_pair_rating),
      homeAdjustment: finite(row.home_adjustment),
      expectedScore: finite(row.expected_score),
      actualScore: finite(row.actual_score),
      totalDelta: finite(row.total_delta),
      calculatedAt: row.calculated_at,
    })),
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function finite(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nullableFinite(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
