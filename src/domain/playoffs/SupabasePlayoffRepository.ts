import type {SupabaseClient} from '@supabase/supabase-js';
import type {PlayoffBracket, PlayoffGame} from '@/domain/playoffs/Playoff';
import type {PlayoffRepository} from '@/domain/playoffs/PlayoffRepository';
import type {Database} from '@/lib/supabase/database';

type Client = SupabaseClient<Database>;
type BracketRow = Database['public']['Tables']['launch_playoff_brackets']['Row'];
type GameRow = Database['public']['Tables']['launch_playoff_games']['Row'];

export class SupabasePlayoffRepository implements PlayoffRepository {
  constructor(private readonly supabase: Client) {}
  async getBracketBySeason(seasonId: string) {
    const {data, error} = await this.supabase.from('launch_playoff_brackets').select('*').eq('season_id', seasonId).maybeSingle();
    if (error) throw error;
    return data ? toBracket(data) : undefined;
  }
  async getGames(bracketId: string) {
    const {data, error} = await this.supabase.from('launch_playoff_games').select('*').eq('bracket_id', bracketId).order('stage', {ascending: false}).order('position');
    if (error) throw error;
    return data.map(toGame);
  }
  async saveBracket(bracket: PlayoffBracket) {
    const {data, error} = await this.supabase.from('launch_playoff_brackets').upsert(fromBracket(bracket)).select().single();
    if (error) throw error;
    return toBracket(data);
  }
  async saveGame(game: PlayoffGame) {
    const {data, error} = await this.supabase.from('launch_playoff_games').upsert(fromGame(game)).select().single();
    if (error) throw error;
    return toGame(data);
  }
}

function toBracket(row: BracketRow): PlayoffBracket {
  return {id: row.id, seasonId: row.season_id, status: row.status as PlayoffBracket['status'], regularSeasonLockedAt: row.regular_season_locked_at, publishedAt: row.published_at, championTeamId: row.champion_team_id, createdAt: row.created_at, updatedAt: row.updated_at};
}
function fromBracket(value: PlayoffBracket): BracketRow {
  return {id: value.id, season_id: value.seasonId, status: value.status, regular_season_locked_at: value.regularSeasonLockedAt, published_at: value.publishedAt, champion_team_id: value.championTeamId, created_at: value.createdAt, updated_at: value.updatedAt};
}
function toGame(row: GameRow): PlayoffGame {
  return {id: row.id, bracketId: row.bracket_id, stage: row.stage as PlayoffGame['stage'], position: row.position as PlayoffGame['position'], matchId: row.match_id, homeSeed: row.home_seed, awaySeed: row.away_seed, createdAt: row.created_at, updatedAt: row.updated_at};
}
function fromGame(value: PlayoffGame): GameRow {
  return {id: value.id, bracket_id: value.bracketId, stage: value.stage, position: value.position, match_id: value.matchId, home_seed: value.homeSeed, away_seed: value.awaySeed, created_at: value.createdAt, updated_at: value.updatedAt};
}
