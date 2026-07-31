import type {SupabaseClient} from '@supabase/supabase-js';
import type {MatchResult} from '@/domain/results/MatchResult';
import type {ResultsRepository} from '@/domain/results/ResultsRepository';
import type {Database} from '@/lib/supabase/database';

type Client = SupabaseClient<Database>;
type Row = Database['public']['Tables']['launch_match_results']['Row'];

export class SupabaseResultsRepository implements ResultsRepository {
  constructor(private readonly supabase: Client) {}

  async getAll(): Promise<MatchResult[]> {
    const {data, error} = await this.supabase
      .from('launch_match_results')
      .select('*')
      .order('updated_at', {ascending: false});
    if (error) throw error;
    return data.map(toResult);
  }

  async getByMatchId(matchId: string): Promise<MatchResult | undefined> {
    const {data, error} = await this.supabase
      .from('launch_match_results')
      .select('*')
      .eq('match_id', matchId)
      .maybeSingle();
    if (error) throw error;
    return data ? toResult(data) : undefined;
  }

  async save(result: MatchResult): Promise<MatchResult> {
    const {data, error} = await this.supabase
      .from('launch_match_results')
      .upsert(fromResult(result))
      .select()
      .single();
    if (error) throw error;
    return toResult(data);
  }
}

function toResult(row: Row): MatchResult {
  return {
    matchId: row.match_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status as MatchResult['status'],
    publishedAt: row.published_at,
    reopenedAt: row.reopened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromResult(result: MatchResult): Row {
  return {
    match_id: result.matchId,
    home_score: result.homeScore,
    away_score: result.awayScore,
    status: result.status,
    published_at: result.publishedAt,
    reopened_at: result.reopenedAt,
    created_at: result.createdAt,
    updated_at: result.updatedAt,
  };
}
