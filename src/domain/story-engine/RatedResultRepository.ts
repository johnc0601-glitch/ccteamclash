import type {RatedResult} from './RatedResult';

/**
 * Read-only boundary for Around the Clash. The Stats Desk never writes ratings
 * and never reaches directly into Matchday persistence tables.
 */
export interface RatedResultRepository {
  getRatedResults(): Promise<RatedResult[]>;
}

export class InMemoryRatedResultRepository implements RatedResultRepository {
  constructor(private readonly results: RatedResult[]) {}

  async getRatedResults(): Promise<RatedResult[]> {
    return [...this.results];
  }
}
