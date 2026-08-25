import type {SupabaseClient} from '@supabase/supabase-js';
import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';
import type {HistoricalPlayerMatchupRepository} from '@/domain/history/HistoricalPlayerMatchupRepository';
import type {Database} from '@/lib/supabase/database';

type Client = SupabaseClient<Database>;
type Table = Database['public']['Tables']['historical_player_matchups'];
type Row = Table['Row'] & {
  historical_team_match_id?: number | null;
  player_side?: string | null;
  home_away_validated?: boolean | null;
};
type Insert = Table['Insert'] & {
  historical_team_match_id?: number | null;
  player_side?: string | null;
  home_away_validated?: boolean | null;
};
type HistoricalCiFact = {
  matchup_deduplication_key: string;
  ci_delta: number;
};

export class SupabaseHistoricalPlayerMatchupRepository implements HistoricalPlayerMatchupRepository {
  constructor(private readonly supabase: Client) {}

  async getByPlayerId(playerId: string): Promise<HistoricalPlayerMatchup[]> {
    const {data, error} = await this.supabase
      .from('historical_player_matchups')
      .select('*')
      .eq('player_id', playerId)
      .order('season_id', {ascending: false})
      .order('event_order', {ascending: false})
      .order('source_row', {ascending: false});
    if (error) throw error;
    return data.map((row) => toDomain(row as Row));
  }

  async getCiDeltasByPlayerId(playerId: string): Promise<Map<string, number>> {
    // Generated Database types intentionally lag this feature migration until
    // the migration is applied. Keep this narrow cast local to the new ledger.
    const ratingClient = this.supabase as unknown as SupabaseClient;
    const {data, error} = await ratingClient
      .from('historical_clash_contest_rating_facts')
      .select('matchup_deduplication_key,ci_delta')
      .eq('player_id', playerId);
    if (error) throw error;
    const facts = (data ?? []) as HistoricalCiFact[];
    return new Map(facts.map((fact) => [fact.matchup_deduplication_key, fact.ci_delta]));
  }

  async upsert(rows: HistoricalPlayerMatchup[]): Promise<number> {
    if (!rows.length) return 0;
    const {data, error} = await this.supabase
      .from('historical_player_matchups')
      .upsert(rows.map(fromDomain), {onConflict: 'deduplication_key'})
      .select('deduplication_key');
    if (error) throw error;
    return data.length;
  }
}

function toDomain(row: Row): HistoricalPlayerMatchup {
  return {
    deduplicationKey: row.deduplication_key,
    seasonId: row.season_id,
    seasonName: row.season_name,
    eventLabel: row.event_label,
    eventMonth: row.event_month,
    eventOrder: row.event_order,
    format: row.match_format as HistoricalPlayerMatchup['format'],
    playerId: row.player_id,
    playerName: row.player_name,
    playerTeamId: row.player_team_id,
    playerTeamName: row.player_team_name,
    partnerPlayerId: row.partner_player_id,
    partnerPlayerName: row.partner_player_name,
    opponentOnePlayerId: row.opponent_one_player_id,
    opponentOnePlayerName: row.opponent_one_player_name,
    opponentTwoPlayerId: row.opponent_two_player_id,
    opponentTwoPlayerName: row.opponent_two_player_name,
    opponentTeamId: row.opponent_team_id,
    opponentTeamName: row.opponent_team_name,
    outcome: row.outcome as HistoricalPlayerMatchup['outcome'],
    rawResult: row.raw_result,
    rawScore: row.raw_score,
    sourceWorkbook: row.source_workbook,
    sourceSheet: row.source_sheet,
    sourceRow: row.source_row,
    historicalTeamMatchId: row.historical_team_match_id ?? null,
    playerSide: row.player_side === 'Home' || row.player_side === 'Away' ? row.player_side : null,
    homeAwayValidated: row.home_away_validated ?? false,
  };
}

function fromDomain(row: HistoricalPlayerMatchup): Insert {
  return {
    deduplication_key: row.deduplicationKey,
    season_id: row.seasonId,
    season_name: row.seasonName,
    event_label: row.eventLabel,
    event_month: row.eventMonth,
    event_order: row.eventOrder,
    match_format: row.format,
    player_id: row.playerId,
    player_name: row.playerName,
    player_team_id: row.playerTeamId,
    player_team_name: row.playerTeamName,
    partner_player_id: row.partnerPlayerId,
    partner_player_name: row.partnerPlayerName,
    opponent_one_player_id: row.opponentOnePlayerId,
    opponent_one_player_name: row.opponentOnePlayerName,
    opponent_two_player_id: row.opponentTwoPlayerId,
    opponent_two_player_name: row.opponentTwoPlayerName,
    opponent_team_id: row.opponentTeamId,
    opponent_team_name: row.opponentTeamName,
    outcome: row.outcome,
    raw_result: row.rawResult,
    raw_score: row.rawScore,
    source_workbook: row.sourceWorkbook,
    source_sheet: row.sourceSheet,
    source_row: row.sourceRow,
    historical_team_match_id: row.historicalTeamMatchId ?? null,
    player_side: row.playerSide ?? null,
    home_away_validated: row.homeAwayValidated ?? false,
  };
}
