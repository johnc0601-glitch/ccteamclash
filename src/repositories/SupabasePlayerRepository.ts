import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database';
import type {Player} from '@/models/Player';
import type {PlayerRepository} from '@/repositories/PlayerRepository';

type Client = SupabaseClient<Database>;
type Row = Database['public']['Tables']['launch_players']['Row'];

export class SupabasePlayerRepository implements PlayerRepository {
  constructor(private readonly supabase: Client) {}

  async getAll(): Promise<Player[]> {
    const {data, error} = await this.supabase.from('launch_players').select('*').order('name');
    if (error) throw error;
    return data.map(toPlayer);
  }

  async getById(id: string): Promise<Player | undefined> {
    const {data, error} = await this.supabase.from('launch_players').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toPlayer(data) : undefined;
  }

  async create(player: Player): Promise<Player> {
    const {data, error} = await this.supabase.from('launch_players').insert(fromPlayer(player)).select().single();
    if (error) throw error;
    return toPlayer(data);
  }

  async update(player: Player): Promise<Player | undefined> {
    const {data, error} = await this.supabase
      .from('launch_players').update(fromPlayer(player)).eq('id', player.id).select().maybeSingle();
    if (error) throw error;
    return data ? toPlayer(data) : undefined;
  }

  async archive(id: string): Promise<Player | undefined> {
    const {data, error} = await this.supabase
      .from('launch_players').update({active: false, updated_at: new Date().toISOString()})
      .eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data ? toPlayer(data) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const {data, error} = await this.supabase.from('launch_players').delete().eq('id', id).select('id');
    if (error) throw error;
    return data.length > 0;
  }
}

function toPlayer(row: Row): Player {
  return {
    id: row.id,
    name: row.name,
    teamId: row.current_team_id ?? '',
    pdgaNumber: row.pdga_number,
    pdgaRating: row.pdga_rating,
    gender: row.gender as Player['gender'],
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromPlayer(player: Player): Database['public']['Tables']['launch_players']['Insert'] {
  return {
    id: player.id,
    name: player.name,
    current_team_id: player.teamId || null,
    pdga_number: player.pdgaNumber,
    pdga_rating: player.pdgaRating,
    gender: player.gender,
    active: player.active,
    created_at: player.createdAt,
    updated_at: player.updatedAt,
  };
}
