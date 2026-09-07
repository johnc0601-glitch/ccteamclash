import {TEAM_MOCK_DATA} from '@/data/teams';
import type {Team} from '@/models/Team';

export interface TeamRepository {
  getAll(): Promise<Team[]>;
  getById(id: string): Promise<Team | undefined>;
  search(text: string): Promise<Team[]>;
  create(team: Team): Promise<Team>;
  update(team: Team): Promise<Team | undefined>;
  archive(id: string): Promise<Team | undefined>;
  delete(id: string): Promise<boolean>;
  getAliases?(): Promise<TeamAlias[]>;
  saveAlias?(alias: TeamAlias): Promise<TeamAlias>;
}

export type TeamAlias = {alias: string; teamId: string};

function cloneTeam(team: Team): Team {
  return {...team};
}

function cloneAlias(alias: TeamAlias): TeamAlias {
  return {...alias};
}

/**
 * In-memory repository for tests and the isolated historical-import fixture.
 * It intentionally does not persist to browser storage; production team data
 * must come from the Supabase-backed repositories.
 */
export class MockTeamRepository implements TeamRepository {
  private teams: Team[] = TEAM_MOCK_DATA.map(cloneTeam);
  private aliases: TeamAlias[] = [];

  async getAll(): Promise<Team[]> {
    return this.teams.map(cloneTeam);
  }

  async getById(id: string): Promise<Team | undefined> {
    const team = this.teams.find((candidate) => candidate.id === id);
    return team ? cloneTeam(team) : undefined;
  }

  async search(text: string): Promise<Team[]> {
    const normalizedText = text.trim().toLocaleLowerCase();
    if (!normalizedText) return this.getAll();

    return this.teams
      .filter((team) => Object.values(team).some((value) =>
        String(value).toLocaleLowerCase().includes(normalizedText),
      ))
      .map(cloneTeam);
  }

  async create(team: Team): Promise<Team> {
    const storedTeam = cloneTeam(team);
    this.teams.push(storedTeam);
    return cloneTeam(storedTeam);
  }

  async update(team: Team): Promise<Team | undefined> {
    const index = this.teams.findIndex((candidate) => candidate.id === team.id);
    if (index === -1) return undefined;

    this.teams[index] = cloneTeam(team);
    return cloneTeam(this.teams[index]);
  }

  async archive(id: string): Promise<Team | undefined> {
    const team = this.teams.find((candidate) => candidate.id === id);
    if (!team) return undefined;

    team.active = false;
    team.updatedAt = new Date().toISOString();
    return cloneTeam(team);
  }

  async delete(id: string): Promise<boolean> {
    const initialLength = this.teams.length;
    this.teams = this.teams.filter((team) => team.id !== id);
    return this.teams.length < initialLength;
  }

  async getAliases(): Promise<TeamAlias[]> {
    return this.aliases.map(cloneAlias);
  }

  async saveAlias(alias: TeamAlias): Promise<TeamAlias> {
    this.aliases = this.aliases.filter(
      (candidate) => candidate.alias.toLocaleLowerCase() !== alias.alias.toLocaleLowerCase(),
    );
    const storedAlias = cloneAlias(alias);
    this.aliases.push(storedAlias);
    return cloneAlias(storedAlias);
  }
}
