import type {MatchResult} from '@/domain/results/MatchResult';

export interface ResultsRepository {
  getAll(): Promise<MatchResult[]>;
  getByMatchId(matchId: string): Promise<MatchResult | undefined>;
  save(result: MatchResult): Promise<MatchResult>;
}

export class MockResultsRepository implements ResultsRepository {
  private results: MatchResult[] = [];

  async getAll(): Promise<MatchResult[]> {
    return this.results.map((result) => ({...result}));
  }

  async getByMatchId(matchId: string): Promise<MatchResult | undefined> {
    const result = this.results.find((candidate) => candidate.matchId === matchId);
    return result ? {...result} : undefined;
  }

  async save(result: MatchResult): Promise<MatchResult> {
    const index = this.results.findIndex((candidate) => candidate.matchId === result.matchId);
    if (index === -1) this.results.push({...result});
    else this.results[index] = {...result};
    return {...result};
  }
}
