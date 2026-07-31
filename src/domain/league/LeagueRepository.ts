import {CCTEAMCLASH_LEAGUE_ID, type League} from '@/domain/league/League';

export interface LeagueRepository {
  getAll(): Promise<League[]>;
  getById(id: string): Promise<League | undefined>;
}

const LEAGUE_MOCK_DATA = [{
  id: CCTEAMCLASH_LEAGUE_ID,
  name: 'CCTeamClash',
  shortName: 'Team Clash',
  active: true,
  createdAt: '2026-01-05T15:00:00.000Z',
  updatedAt: '2026-01-05T15:00:00.000Z',
}] as const satisfies readonly League[];

export class MockLeagueRepository implements LeagueRepository {
  async getAll(): Promise<League[]> {
    return LEAGUE_MOCK_DATA.map((league) => ({...league}));
  }

  async getById(id: string): Promise<League | undefined> {
    const league = LEAGUE_MOCK_DATA.find((candidate) => candidate.id === id);
    return league ? {...league} : undefined;
  }
}
