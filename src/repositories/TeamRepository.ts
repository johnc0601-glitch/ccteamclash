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
}

function cloneTeam(team: Team): Team {
  return {...team};
}

export class MockTeamRepository implements TeamRepository {
  private teams: Team[] = TEAM_MOCK_DATA.map(cloneTeam);

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
}
