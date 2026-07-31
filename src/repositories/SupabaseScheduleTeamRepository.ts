import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database';
import type {Team} from '@/models/Team';
import type {TeamAlias, TeamRepository} from '@/repositories/TeamRepository';

type Client = SupabaseClient<Database>;
type Row = Database['public']['Tables']['launch_teams']['Row'];

export class SupabaseScheduleTeamRepository implements TeamRepository {
  constructor(private readonly supabase: Client) {}

  async getAll(): Promise<Team[]> {
    const {data, error} = await this.supabase.from('launch_teams').select('*').order('name');
    if (error) throw error;
    return data.map(toTeam);
  }

  async getById(id: string): Promise<Team | undefined> {
    const {data, error} = await this.supabase.from('launch_teams').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toTeam(data) : undefined;
  }

  async search(text: string): Promise<Team[]> {
    const normalized = text.trim().toLocaleLowerCase();
    return (await this.getAll()).filter((team) =>
      team.name.toLocaleLowerCase().includes(normalized)
      || team.shortName.toLocaleLowerCase().includes(normalized));
  }

  async create(): Promise<Team> {
    throw new Error('Schedule team access is read-only.');
  }

  async update(): Promise<Team | undefined> {
    throw new Error('Schedule team access is read-only.');
  }

  async archive(): Promise<Team | undefined> {
    throw new Error('Schedule team access is read-only.');
  }

  async delete(): Promise<boolean> {
    throw new Error('Schedule team access is read-only.');
  }

  async getAliases(): Promise<TeamAlias[]> {
    const {data, error} = await this.supabase.from('launch_team_aliases').select('alias, team_id');
    if (error) throw error;
    return data.map((row) => ({alias: row.alias, teamId: row.team_id}));
  }

  async saveAlias(alias: TeamAlias): Promise<TeamAlias> {
    const {data, error} = await this.supabase.from('launch_team_aliases')
      .upsert({alias: alias.alias, normalized_alias: normalize(alias.alias), team_id: alias.teamId}, {
        onConflict: 'normalized_alias',
      })
      .select('alias, team_id')
      .single();
    if (error) throw error;
    return {alias: data.alias, teamId: data.team_id};
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function toTeam(row: Row): Team {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    city: '',
    state: '',
    captain: '',
    homeCourse: '',
    logo: row.logo,
    primaryColor: '',
    secondaryColor: '',
    website: '',
    facebook: '',
    description: '',
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
