import type {SupabaseClient} from '@supabase/supabase-js';
import type {Season} from '@/domain/season/Season';
import type {SeasonRepository} from '@/domain/season/SeasonRepository';
import type {Database} from '@/lib/supabase/database';

type Client = SupabaseClient<Database>;
type Row = Database['public']['Tables']['launch_seasons']['Row'];

export class SupabaseSeasonRepository implements SeasonRepository {
  constructor(private readonly supabase: Client) {}

  async getAll(): Promise<Season[]> {
    const {data, error} = await this.supabase.from('launch_seasons').select('*');
    if (error) throw error;
    return data.map(toSeason);
  }

  async getById(id: string): Promise<Season | undefined> {
    const {data, error} = await this.supabase.from('launch_seasons').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toSeason(data) : undefined;
  }

  async getActive(): Promise<Season | undefined> {
    const {data, error} = await this.supabase.from('launch_seasons').select('*').eq('active', true).maybeSingle();
    if (error) throw error;
    return data ? toSeason(data) : undefined;
  }

  async create(season: Season): Promise<Season> {
    const {data, error} = await this.supabase.from('launch_seasons').insert(fromSeason(season)).select().single();
    if (error) throw error;
    return toSeason(data);
  }

  async update(season: Season): Promise<Season | undefined> {
    const {data, error} = await this.supabase.from('launch_seasons').update(fromSeason(season)).eq('id', season.id).select().maybeSingle();
    if (error) throw error;
    return data ? toSeason(data) : undefined;
  }

  async archive(id: string): Promise<Season | undefined> {
    const {data, error} = await this.supabase.from('launch_seasons')
      .update({active: false, registration_open: false, archived: true, updated_at: new Date().toISOString()})
      .eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data ? toSeason(data) : undefined;
  }

  async activate(id: string): Promise<Season | undefined> {
    const {error: deactivateError} = await this.supabase.from('launch_seasons')
      .update({active: false, updated_at: new Date().toISOString()}).eq('active', true);
    if (deactivateError) throw deactivateError;
    const {data, error} = await this.supabase.from('launch_seasons')
      .update({active: true, updated_at: new Date().toISOString()}).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data ? toSeason(data) : undefined;
  }

  async duplicate(season: Season): Promise<Season> {
    return this.create(season);
  }

  async delete(id: string): Promise<boolean> {
    const {data, error} = await this.supabase.from('launch_seasons').delete().eq('id', id).select('id');
    if (error) throw error;
    return data.length > 0;
  }
}

function toSeason(row: Row): Season {
  return {
    id: row.id,
    leagueId: row.league_id,
    name: row.name,
    year: row.year,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    registrationOpen: row.registration_open,
    active: row.active,
    published: row.published,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromSeason(season: Season): Row {
  return {
    id: season.id,
    league_id: season.leagueId,
    name: season.name,
    year: season.year,
    description: season.description,
    start_date: season.startDate,
    end_date: season.endDate,
    registration_open: season.registrationOpen,
    active: season.active,
    published: season.published,
    archived: season.archived,
    created_at: season.createdAt,
    updated_at: season.updatedAt,
  };
}
