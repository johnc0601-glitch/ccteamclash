import type {SupabaseClient} from '@supabase/supabase-js';
import type {RatedResult} from './RatedResult';
import type {RatedResultRepository} from './RatedResultRepository';
import {
  annotateHistoricalRatingSeedSources,
  type HistoricalRatingSeedRow,
} from './HistoricalRatingSeedConfidence';

const PAGE_SIZE = 500;

/**
 * Read-only decorator that adds historical seed-source confidence to normalized
 * results. It never changes CI, win probability, or the underlying repository.
 */
export class SeedAnnotatedHistoricalRepository implements RatedResultRepository {
  constructor(
    private readonly base: RatedResultRepository,
    private readonly supabase: SupabaseClient,
  ) {}

  async getRatedResults(): Promise<RatedResult[]> {
    const [results, seeds] = await Promise.all([
      this.base.getRatedResults(),
      this.loadSeeds(),
    ]);
    return annotateHistoricalRatingSeedSources(results, seeds);
  }

  private async loadSeeds(): Promise<HistoricalRatingSeedRow[]> {
    const rows: HistoricalRatingSeedRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const {data, error} = await this.supabase
        .from('clash_rating_historical_seeds')
        .select('season_id,player_name,source')
        .order('season_id', {ascending: true})
        .order('player_name', {ascending: true})
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as HistoricalRatingSeedRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  }
}
