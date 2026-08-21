import 'server-only';

import {TEAM_MOCK_DATA} from '@/data/teams';
import type {Team} from '@/models/Team';
import type {TeamRepository} from '@/repositories/TeamRepository';
import {TeamService} from '@/services/TeamService';
import type {TeamInput, TeamQuery, TeamServiceResult} from '@/types/team';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';

type LaunchTeamRow = {
  id: string;
  name: string;
  short_name: string;
  logo: string;
  primary_color?: string | null;
  secondary_color?: string | null;
  city?: string | null;
  state?: string | null;
  captain?: string | null;
  home_course?: string | null;
  website?: string | null;
  facebook?: string | null;
  description?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

class SupabaseTeamRepository implements TeamRepository {
  async getAll(): Promise<Team[]> {
    if (!hasSupabaseConfig()) return getSeedTeams();
    const supabase = await createClient();
    const {data, error} = await (supabase as any).from('launch_teams').select('*').order('name');
    if (error) throw error;
    return mergeSeedTeamDefaults((data ?? []).map(toTeam), await getSeedTeams());
  }

  async getById(id: string): Promise<Team | undefined> {
    if (!hasSupabaseConfig()) return (await getSeedTeams()).find((team) => team.id === id);
    const supabase = await createClient();
    const {data, error} = await (supabase as any).from('launch_teams').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const [team] = mergeSeedTeamDefaults([toTeam(data)], await getSeedTeams());
    return team;
  }

  async search(text: string): Promise<Team[]> {
    const normalized = text.trim().toLocaleLowerCase();
    const teams = await this.getAll();
    if (!normalized) return teams;
    return teams.filter((team) => Object.values(team).some((value) =>
      String(value).toLocaleLowerCase().includes(normalized),
    ));
  }

  async create(team: Team): Promise<Team> {
    const supabase = await requireSupabase();
    const {data, error} = await (supabase as any)
      .from('launch_teams')
      .insert(fromTeam(team))
      .select('*')
      .single();
    if (error) throw error;
    return toTeam(data);
  }

  async update(team: Team): Promise<Team | undefined> {
    const supabase = await requireSupabase();
    const {data, error} = await (supabase as any)
      .from('launch_teams')
      .update(fromTeam(team))
      .eq('id', team.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? toTeam(data) : undefined;
  }

  async archive(id: string): Promise<Team | undefined> {
    const supabase = await requireSupabase();
    const {data, error} = await (supabase as any)
      .from('launch_teams')
      .update({active: false, updated_at: new Date().toISOString()})
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? toTeam(data) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const supabase = await requireSupabase();
    const {data, error} = await (supabase as any)
      .from('launch_teams')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return Boolean(data?.length);
  }
}

export async function getStoredTeams(query: Partial<TeamQuery> = {}): Promise<Team[]> {
  return new TeamService(new SupabaseTeamRepository()).getAll(query);
}

export async function getStoredTeamById(id: string): Promise<Team | undefined> {
  return new TeamService(new SupabaseTeamRepository()).getById(id);
}

export async function createStoredTeam(input: TeamInput): Promise<TeamServiceResult<Team>> {
  return runTeamMutation((service) => service.create(input));
}

export async function updateStoredTeam(id: string, input: TeamInput): Promise<TeamServiceResult<Team>> {
  return runTeamMutation((service) => service.update(id, input));
}

export async function archiveStoredTeam(id: string): Promise<TeamServiceResult<Team>> {
  return runTeamMutation((service) => service.archive(id));
}

export async function deleteStoredTeam(id: string): Promise<TeamServiceResult<string>> {
  return runTeamMutation((service) => service.delete(id));
}

async function runTeamMutation<T>(action: (service: TeamService) => Promise<TeamServiceResult<T>>): Promise<TeamServiceResult<T>> {
  if (!hasSupabaseConfig()) return {ok: false, message: 'Team storage is not connected yet.'};
  try {
    return await action(new TeamService(new SupabaseTeamRepository()));
  } catch (error) {
    return {ok: false, message: error instanceof Error ? error.message : 'Team could not be saved.'};
  }
}

async function requireSupabase() {
  if (!hasSupabaseConfig()) throw new Error('Team storage is not connected yet.');
  return createClient();
}

function toTeam(row: LaunchTeamRow): Team {
  return {
    id: cleanText(row.id),
    name: cleanText(row.name),
    shortName: cleanText(row.short_name),
    city: cleanText(row.city),
    state: cleanText(row.state).toUpperCase(),
    captain: cleanText(row.captain),
    homeCourse: cleanText(row.home_course),
    logo: cleanText(row.logo),
    primaryColor: cleanText(row.primary_color) || '#006f71',
    secondaryColor: cleanText(row.secondary_color) || '#f4f6f2',
    website: cleanText(row.website),
    facebook: cleanText(row.facebook),
    description: cleanText(row.description),
    active: row.active !== false,
    createdAt: cleanText(row.created_at) || new Date().toISOString(),
    updatedAt: cleanText(row.updated_at) || new Date().toISOString(),
  };
}

function fromTeam(team: Team) {
  return {
    id: team.id,
    name: team.name,
    short_name: team.shortName,
    logo: team.logo,
    primary_color: team.primaryColor,
    secondary_color: team.secondaryColor,
    city: team.city,
    state: team.state,
    captain: team.captain,
    home_course: team.homeCourse,
    website: team.website,
    facebook: team.facebook,
    description: team.description,
    active: team.active,
    created_at: team.createdAt,
    updated_at: team.updatedAt,
  };
}

async function getSeedTeams(): Promise<Team[]> {
  return TEAM_MOCK_DATA.map((team) => ({...team}));
}

function mergeSeedTeamDefaults(teams: Team[], seedTeams: Team[]): Team[] {
  const seedById = new Map(seedTeams.map((team) => [team.id, team]));
  const seedByName = new Map(seedTeams.map((team) => [team.name.toLocaleLowerCase(), team]));
  return teams.map((team) => {
    const seed = seedById.get(team.id) ?? seedByName.get(team.name.toLocaleLowerCase());
    if (!seed) return team;
    return {
      ...team,
      city: team.city || seed.city,
      state: team.state || seed.state,
      captain: team.captain || seed.captain,
      homeCourse: team.homeCourse || seed.homeCourse,
      logo: team.logo || seed.logo,
      primaryColor: team.primaryColor || seed.primaryColor,
      secondaryColor: team.secondaryColor || seed.secondaryColor,
      website: team.website || seed.website,
      facebook: team.facebook || seed.facebook,
      description: team.description || seed.description,
    };
  });
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
