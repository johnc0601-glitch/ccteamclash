import type {SupabaseClient} from '@supabase/supabase-js';
import type {League} from '@/domain/league/League';
import type {LeagueRepository} from '@/domain/league/LeagueRepository';
import type {Database} from '@/lib/supabase/database';

type Client = SupabaseClient<Database>;
type Row = Database['public']['Tables']['launch_leagues']['Row'];

export class SupabaseLeagueRepository implements LeagueRepository {
  constructor(private readonly supabase: Client) {}

  async getAll(): Promise<League[]> {
    const {data, error} = await this.supabase.from('launch_leagues').select('*');
    if (error) throw error;
    return data.map(toLeague);
  }

  async getById(id: string): Promise<League | undefined> {
    const {data, error} = await this.supabase.from('launch_leagues')
      .select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toLeague(data) : undefined;
  }
}

function toLeague(row: Row): League {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
