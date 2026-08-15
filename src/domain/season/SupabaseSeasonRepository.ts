import type {SupabaseClient} from '@supabase/supabase-js';
import type {Season, SeasonRosterRulesState} from '@/domain/season/Season';
import type {SeasonRepository} from '@/domain/season/SeasonRepository';
import type {Database} from '@/lib/supabase/database';

type Client = SupabaseClient<Database>;
type Row = Database['public']['Tables']['launch_seasons']['Row'];
type InsertRow = Database['public']['Tables']['launch_seasons']['Insert'];
type GeneratedRosterRulesStateRow = Database['public']['Functions'][
  'get_launch_season_roster_rules_states'
]['Returns'][number];
type RosterRulesStateRow = Omit<GeneratedRosterRulesStateRow, 'lock_at' | 'locked_at'> & {
  lock_at: string | null;
  locked_at: string | null;
};

export class SupabaseSeasonRepository implements SeasonRepository {
  constructor(private readonly supabase: Client) {}

  async getAll(): Promise<Season[]> {
    const {data, error} = await this.supabase.from('launch_seasons').select('*');
    if (error) throw error;
    return this.withRosterRules(data);
  }

  async getById(id: string): Promise<Season | undefined> {
    const {data, error} = await this.supabase.from('launch_seasons').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? (await this.withRosterRules([data]))[0] : undefined;
  }

  async getActive(): Promise<Season | undefined> {
    const {data, error} = await this.supabase.from('launch_seasons').select('*').eq('active', true).maybeSingle();
    if (error) throw error;
    return data ? (await this.withRosterRules([data]))[0] : undefined;
  }

  async create(season: Season): Promise<Season> {
    const {data, error} = await this.supabase
      .from('launch_seasons').insert(fromSeason(season)).select().single();
    if (error) throw error;
    return (await this.withRosterRules([data]))[0];
  }

  async update(season: Season): Promise<Season | undefined> {
    const {data, error} = await this.supabase
      .from('launch_seasons').update(fromSeason(season)).eq('id', season.id).select().maybeSingle();
    if (error) throw error;
    return data ? (await this.withRosterRules([data]))[0] : undefined;
  }

  async archive(id: string): Promise<Season | undefined> {
    const {data, error} = await this.supabase.from('launch_seasons')
      .update({active: false, registration_open: false, archived: true, updated_at: new Date().toISOString()})
      .eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data ? (await this.withRosterRules([data]))[0] : undefined;
  }

  async activate(id: string): Promise<Season | undefined> {
    const {error: deactivateError} = await this.supabase.from('launch_seasons')
      .update({active: false, updated_at: new Date().toISOString()}).eq('active', true);
    if (deactivateError) throw deactivateError;
    const {data, error} = await this.supabase.from('launch_seasons')
      .update({active: true, updated_at: new Date().toISOString()}).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data ? (await this.withRosterRules([data]))[0] : undefined;
  }

  async duplicate(season: Season): Promise<Season> {
    return this.create(season);
  }

  async delete(id: string): Promise<boolean> {
    const {data, error} = await this.supabase.from('launch_seasons').delete().eq('id', id).select('id');
    if (error) throw error;
    return data.length > 0;
  }

  private async withRosterRules(rows: Row[]): Promise<Season[]> {
    if (rows.length === 0) return [];
    const {data, error} = await this.supabase
      .rpc('get_launch_season_roster_rules_states', {target_season_ids: rows.map((row) => row.id)});
    if (error) throw error;
    const rulesBySeason = new Map(
      (data as RosterRulesStateRow[]).map((state) => [state.season_id, state]),
    );
    return rows.map((row) => {
      const state = rulesBySeason.get(row.id);
      const rules: SeasonRosterRulesState = {
        rosterRulesLockAt: state?.lock_at ?? null,
        rosterRulesLockedAt: state?.locked_at ?? row.roster_rules_locked_at,
        rosterRulesLocked: state?.locked ?? Boolean(row.roster_rules_locked_at),
      };
      return toSeason(row, rules);
    });
  }
}

function toSeason(row: Row, rules: SeasonRosterRulesState): Season {
  return {
    id: row.id,
    leagueId: row.league_id,
    name: row.name,
    year: row.year,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    registrationOpen: row.registration_open,
    mensRosterCap: row.mens_roster_cap,
    womensRosterCap: row.womens_roster_cap,
    juniorRosterCap: row.junior_roster_cap,
    ...rules,
    active: row.active,
    published: row.published,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromSeason(season: Season): InsertRow {
  return {
    id: season.id,
    league_id: season.leagueId,
    name: season.name,
    year: season.year,
    description: season.description,
    start_date: season.startDate,
    end_date: season.endDate,
    registration_open: season.registrationOpen,
    mens_roster_cap: season.mensRosterCap,
    womens_roster_cap: season.womensRosterCap,
    junior_roster_cap: season.juniorRosterCap,
    active: season.active,
    published: season.published,
    archived: season.archived,
    created_at: season.createdAt,
    updated_at: season.updatedAt,
  };
}
