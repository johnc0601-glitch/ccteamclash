import type {SupabaseClient} from '@supabase/supabase-js';
import type {RatedResult} from './RatedResult';
import type {RatedResultRepository} from './RatedResultRepository';
import {
  buildHistoricalRatedResultReport,
  type HistoricalEventMetadataRow,
  type HistoricalRatedResultBuildReport,
  type StoredHistoricalRatingFact,
} from './SupabaseHistoricalRatedResultRepository';

const PAGE_SIZE = 500;

/**
 * Clash Pulse reads the same immutable production historical archive used by
 * public Stats. The historical_team_matches table is intentionally not public,
 * so this reader validates the public immutable fact ledger plus event metadata
 * and lets the shared builder quarantine malformed contests structurally.
 *
 * This client is read-only. It never writes ratings, results, stories, or any
 * other production state.
 */
export class PublicHistoricalPulseRepository implements RatedResultRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getBuildReport(): Promise<HistoricalRatedResultBuildReport> {
    const [facts, metadata] = await Promise.all([
      this.loadFacts(),
      this.loadMetadata(),
    ]);

    // Public historical reads do not expose historical_team_matches. Nulling
    // this cross-reference disables only that private-table cross-check; the
    // shared builder still verifies contest team count, opponents, player count,
    // side/venue consistency, source-event identity, and chronology.
    const publicMetadata = metadata.map((row) => ({
      ...row,
      historical_team_match_id: null,
    }));

    return buildHistoricalRatedResultReport(facts, publicMetadata, []);
  }

  async getRatedResults(): Promise<RatedResult[]> {
    return (await this.getBuildReport()).results;
  }

  private async loadFacts(): Promise<StoredHistoricalRatingFact[]> {
    const rows: StoredHistoricalRatingFact[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const {data, error} = await this.supabase
        .from('historical_clash_contest_rating_facts')
        .select('matchup_deduplication_key,contest_id,historical_match_key,season_id,player_id,player_name,team_id,team_name,opponent_team_id,opponent_team_name,side,venue,format,outcome,clash_index_before,opponent_effective_ci,win_probability,actual_points,expected_points,ci_delta,algorithm_version')
        .order('matchup_deduplication_key', {ascending: true})
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Pulse historical fact read failed: ${error.message}`);
      const page = (data ?? []) as StoredHistoricalRatingFact[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  }

  private async loadMetadata(): Promise<HistoricalEventMetadataRow[]> {
    const rows: HistoricalEventMetadataRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const {data, error} = await this.supabase
        .from('historical_player_matchups')
        .select('deduplication_key,season_id,season_name,event_label,event_order,historical_team_match_id')
        .order('deduplication_key', {ascending: true})
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Pulse historical metadata read failed: ${error.message}`);
      const page = (data ?? []) as HistoricalEventMetadataRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  }
}
