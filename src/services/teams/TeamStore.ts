import {list, put} from '@vercel/blob';
import {TEAM_MOCK_DATA} from '@/data/teams';
import type {Team} from '@/models/Team';
import type {TeamRepository} from '@/repositories/TeamRepository';
import {TeamService} from '@/services/TeamService';
import type {TeamInput, TeamQuery, TeamServiceResult} from '@/types/team';

const TEAM_STORE_PATH = 'content/teams.json';
const TEAM_STORE_TIMEOUT_MS = 2500;

type TeamPayload = {
  teams: Team[];
};

class TeamListRepository implements TeamRepository {
  private teams: Team[];

  constructor(teams: Team[]) {
    this.teams = teams.map(cloneTeam);
  }

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
    this.teams.push(cloneTeam(team));
    return cloneTeam(team);
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

export async function getStoredTeams(query: Partial<TeamQuery> = {}): Promise<Team[]> {
  const repository = new TeamListRepository(await loadTeams());
  const service = new TeamService(repository);
  return service.getAll(query);
}

export async function getStoredTeamById(id: string): Promise<Team | undefined> {
  const repository = new TeamListRepository(await loadTeams());
  const service = new TeamService(repository);
  return service.getById(id);
}

export async function createStoredTeam(input: TeamInput): Promise<TeamServiceResult<Team>> {
  return mutateTeams((service) => service.create(input));
}

export async function updateStoredTeam(id: string, input: TeamInput): Promise<TeamServiceResult<Team>> {
  return mutateTeams((service) => service.update(id, input));
}

export async function archiveStoredTeam(id: string): Promise<TeamServiceResult<Team>> {
  return mutateTeams((service) => service.archive(id));
}

export async function deleteStoredTeam(id: string): Promise<TeamServiceResult<string>> {
  return mutateTeams((service) => service.delete(id));
}

async function mutateTeams<T>(
  action: (service: TeamService) => Promise<TeamServiceResult<T>>,
): Promise<TeamServiceResult<T>> {
  const repository = new TeamListRepository(await loadTeams());
  const service = new TeamService(repository);
  const result = await action(service);

  if (result.ok) {
    await saveTeams(await repository.getAll());
  }

  return result;
}

async function loadTeams(): Promise<Team[]> {
  const seedTeams = await getSeedTeams();
  if (!isBlobConnected()) {
    return seedTeams;
  }

  try {
    const result = await withTimeout(list({
      prefix: TEAM_STORE_PATH,
      limit: 1,
    }));
    const teamBlob = result.blobs.find((blob) => blob.pathname === TEAM_STORE_PATH);

    if (!teamBlob) {
      return seedTeams;
    }

    const response = await fetch(teamBlob.url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TEAM_STORE_TIMEOUT_MS),
    });
    if (!response.ok) {
      return seedTeams;
    }

    const payload = await response.json() as Partial<TeamPayload>;
    return mergeSeedTeamDefaults(normalizeTeams(payload.teams), seedTeams);
  } catch {
    return seedTeams;
  }
}

async function saveTeams(teams: Team[]): Promise<Team[]> {
  if (!isBlobConnected()) {
    throw new Error('Team storage is not connected yet.');
  }

  const normalizedTeams = normalizeTeams(teams);
  await put(TEAM_STORE_PATH, JSON.stringify({teams: normalizedTeams}, null, 2), {
    access: 'public',
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: 'application/json',
  });

  return normalizedTeams;
}

async function getSeedTeams(): Promise<Team[]> {
  return normalizeTeams(TEAM_MOCK_DATA);
}

function mergeSeedTeamDefaults(teams: Team[], seedTeams: Team[]): Team[] {
  const seedById = new Map(seedTeams.map((team) => [team.id, team]));
  const mergedTeams = teams.map((team) => {
    const seedTeam = seedById.get(team.id);
    return seedTeam && !team.homeCourse
      ? {...team, homeCourse: seedTeam.homeCourse}
      : team;
  });
  const existingIds = new Set(mergedTeams.map((team) => team.id));
  return [
    ...mergedTeams,
    ...seedTeams.filter((team) => !existingIds.has(team.id)),
  ];
}

function normalizeTeams(teams: unknown): Team[] {
  if (!Array.isArray(teams)) return [];

  return teams
    .map(normalizeTeam)
    .filter((team): team is Team => Boolean(team));
}

function normalizeTeam(value: unknown): Team | null {
  if (!value || typeof value !== 'object') return null;

  const team = value as Partial<Team>;
  const id = cleanText(team.id);
  const name = cleanText(team.name);
  const shortName = cleanText(team.shortName);

  if (!id || !name || !shortName) return null;

  return {
    id,
    name,
    shortName,
    city: cleanText(team.city),
    state: cleanText(team.state).toUpperCase(),
    captain: cleanText(team.captain),
    homeCourse: cleanText(team.homeCourse),
    logo: cleanText(team.logo),
    primaryColor: cleanText(team.primaryColor) || '#121814',
    secondaryColor: cleanText(team.secondaryColor) || '#f4f6f2',
    website: cleanText(team.website),
    facebook: cleanText(team.facebook),
    description: cleanText(team.description),
    active: team.active !== false,
    createdAt: cleanText(team.createdAt) || new Date().toISOString(),
    updatedAt: cleanText(team.updatedAt) || new Date().toISOString(),
  };
}

function cloneTeam(team: Team): Team {
  return {...team};
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isBlobConnected(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Team storage timed out.')), TEAM_STORE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
