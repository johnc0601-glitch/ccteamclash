import type {League} from '@/domain/league/League';
import type {LeagueRepository} from '@/domain/league/LeagueRepository';

export class LeagueService {
  constructor(private readonly repository: LeagueRepository) {}

  async getAll(): Promise<League[]> {
    return (await this.repository.getAll())
      .sort((left, right) => left.name.localeCompare(right.name, undefined, {sensitivity: 'base'}));
  }

  async getById(id: string): Promise<League | undefined> {
    return this.repository.getById(id);
  }
}
