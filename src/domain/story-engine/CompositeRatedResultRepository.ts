import type {RatedResult} from './RatedResult';
import type {RatedResultRepository} from './RatedResultRepository';

/**
 * Presents historical archives and future live Matchday facts as one read-only
 * result stream. Duplicate normalized IDs are treated as a data-contract error
 * rather than silently preferring one source.
 */
export class CompositeRatedResultRepository implements RatedResultRepository {
  constructor(private readonly repositories: readonly RatedResultRepository[]) {}

  async getRatedResults(): Promise<RatedResult[]> {
    const sourceResults = await Promise.all(this.repositories.map((repository) => repository.getRatedResults()));
    const byId = new Map<string, RatedResult>();

    for (const result of sourceResults.flat()) {
      if (byId.has(result.id)) {
        throw new Error(`Duplicate RatedResult id across story sources: ${result.id}`);
      }
      byId.set(result.id, result);
    }

    return [...byId.values()].sort((a, b) =>
      a.playedAt.localeCompare(b.playedAt)
      || (a.eventOrder ?? 0) - (b.eventOrder ?? 0)
      || a.id.localeCompare(b.id),
    );
  }
}
