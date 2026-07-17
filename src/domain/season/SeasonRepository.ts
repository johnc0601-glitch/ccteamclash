import type {Season} from '@/domain/season/Season';

export interface SeasonRepository {
  getAll(): Promise<Season[]>;
  getById(id: string): Promise<Season | undefined>;
  getActive(): Promise<Season | undefined>;
  create(season: Season): Promise<Season>;
  update(season: Season): Promise<Season | undefined>;
  archive(id: string): Promise<Season | undefined>;
  activate(id: string): Promise<Season | undefined>;
  duplicate(season: Season): Promise<Season>;
  delete(id: string): Promise<boolean>;
}

const SEASON_MOCK_DATA = [
  {
    id: 'summer-team-clash-2026',
    name: 'Summer Team Clash 2026',
    year: 2026,
    description: 'The current championship season for weekly team match play.',
    startDate: '2026-06-06',
    endDate: '2026-09-26',
    registrationOpen: true,
    active: true,
    published: true,
    archived: false,
    createdAt: '2026-01-05T15:00:00.000Z',
    updatedAt: '2026-07-12T17:30:00.000Z',
  },
  {
    id: 'spring-team-clash-2026',
    name: 'Spring Team Clash 2026',
    year: 2026,
    description: 'A completed spring competition retained for league operations and reporting.',
    startDate: '2026-02-07',
    endDate: '2026-05-23',
    registrationOpen: false,
    active: false,
    published: true,
    archived: false,
    createdAt: '2025-11-18T14:00:00.000Z',
    updatedAt: '2026-05-24T13:10:00.000Z',
  },
  {
    id: 'fall-team-clash-2025',
    name: 'Fall Team Clash 2025',
    year: 2025,
    description: 'The archived fall season and its historical league record.',
    startDate: '2025-08-09',
    endDate: '2025-11-22',
    registrationOpen: false,
    active: false,
    published: true,
    archived: true,
    createdAt: '2025-04-14T16:00:00.000Z',
    updatedAt: '2025-11-24T14:45:00.000Z',
  },
  {
    id: 'team-clash-2027-planning',
    name: 'Team Clash 2027 Planning',
    year: 2027,
    description: 'An internal draft for the next league year.',
    startDate: '',
    endDate: '',
    registrationOpen: false,
    active: false,
    published: false,
    archived: false,
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-15T19:20:00.000Z',
  },
] as const satisfies readonly Season[];

function cloneSeason(season: Season): Season {
  return {...season};
}

export class MockSeasonRepository implements SeasonRepository {
  private seasons: Season[] = SEASON_MOCK_DATA.map(cloneSeason);

  async getAll(): Promise<Season[]> {
    return this.seasons.map(cloneSeason);
  }

  async getById(id: string): Promise<Season | undefined> {
    const season = this.seasons.find((candidate) => candidate.id === id);
    return season ? cloneSeason(season) : undefined;
  }

  async getActive(): Promise<Season | undefined> {
    const season = this.seasons.find((candidate) => candidate.active && !candidate.archived);
    return season ? cloneSeason(season) : undefined;
  }

  async create(season: Season): Promise<Season> {
    const storedSeason = cloneSeason(season);
    this.seasons.push(storedSeason);
    return cloneSeason(storedSeason);
  }

  async update(season: Season): Promise<Season | undefined> {
    const index = this.seasons.findIndex((candidate) => candidate.id === season.id);
    if (index === -1) return undefined;

    this.seasons[index] = cloneSeason(season);
    return cloneSeason(this.seasons[index]);
  }

  async archive(id: string): Promise<Season | undefined> {
    const season = this.seasons.find((candidate) => candidate.id === id);
    if (!season) return undefined;

    season.active = false;
    season.registrationOpen = false;
    season.archived = true;
    season.updatedAt = new Date().toISOString();
    return cloneSeason(season);
  }

  async activate(id: string): Promise<Season | undefined> {
    const target = this.seasons.find((candidate) => candidate.id === id);
    if (!target) return undefined;

    const timestamp = new Date().toISOString();
    this.seasons = this.seasons.map((season) => {
      const active = season.id === id;
      return season.active === active ? season : {...season, active, updatedAt: timestamp};
    });

    const activatedSeason = this.seasons.find((candidate) => candidate.id === id);
    return activatedSeason ? cloneSeason(activatedSeason) : undefined;
  }

  async duplicate(season: Season): Promise<Season> {
    const storedSeason = cloneSeason(season);
    this.seasons.push(storedSeason);
    return cloneSeason(storedSeason);
  }

  async delete(id: string): Promise<boolean> {
    const initialLength = this.seasons.length;
    this.seasons = this.seasons.filter((season) => season.id !== id);
    return this.seasons.length < initialLength;
  }
}
