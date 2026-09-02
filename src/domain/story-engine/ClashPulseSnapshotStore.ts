import type {SupabaseClient} from '@supabase/supabase-js';
import type {RatedResult} from './RatedResult';
import type {StoryBacktestReport} from './StoryBacktestReport';

export const CLASH_PULSE_SNAPSHOT_VERSION = 1;

export type ClashPulseProvenance = {
  snapshotVersion: number;
  sourceTables: string[];
  sourceResultIds: string[];
  sourceContestIds: string[];
  sourceEventIds: string[];
  sourceAlgorithmVersions: string[];
  sourcePlayedAt: {earliest: string | null; latest: string | null};
  sourceFactRows: number;
  sourceContests: number;
  emittedContests: number;
  quarantinedContests: number;
};

export type ClashPulseSnapshot = {
  seasonId: string;
  seasonName: string | null;
  report: StoryBacktestReport;
  provenance: ClashPulseProvenance;
  generatedAt: string;
  generatedBy: string;
  refreshTrigger: string;
};

type SnapshotRow = {
  season_id: string;
  season_name: string | null;
  candidate_payload: StoryBacktestReport;
  provenance: ClashPulseProvenance;
  generated_at: string;
  generated_by: string;
  refresh_trigger: string;
};

export function buildClashPulseProvenance(
  results: RatedResult[],
  build: Pick<ClashPulseProvenance, 'sourceFactRows' | 'sourceContests' | 'emittedContests' | 'quarantinedContests'>,
): ClashPulseProvenance {
  const unique = (values: string[]) => [...new Set(values)].sort();
  const timestamps = results.map((result) => result.playedAt).filter(Boolean).sort();
  return {
    snapshotVersion: CLASH_PULSE_SNAPSHOT_VERSION,
    sourceTables: ['historical_clash_contest_rating_facts', 'historical_player_matchups'],
    sourceResultIds: unique(results.map((result) => result.id)),
    sourceContestIds: unique(results.map((result) => result.contestId)),
    sourceEventIds: unique(results.map((result) => result.eventId)),
    sourceAlgorithmVersions: unique(results.map((result) => result.modelVersion)),
    sourcePlayedAt: {earliest: timestamps[0] ?? null, latest: timestamps.at(-1) ?? null},
    ...build,
  };
}

export class ClashPulseSnapshotStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(): Promise<ClashPulseSnapshot[]> {
    const {data, error} = await this.supabase.from('clash_pulse_snapshots')
      .select('season_id,season_name,candidate_payload,provenance,generated_at,generated_by,refresh_trigger')
      .order('season_id', {ascending: true});
    if (error) throw new Error(`Pulse snapshot read failed: ${error.message}`);
    return ((data ?? []) as unknown as SnapshotRow[]).map((row) => ({
      seasonId: row.season_id, seasonName: row.season_name, report: row.candidate_payload,
      provenance: row.provenance, generatedAt: row.generated_at, generatedBy: row.generated_by,
      refreshTrigger: row.refresh_trigger,
    }));
  }

  async save(snapshot: ClashPulseSnapshot): Promise<void> {
    const {error} = await this.supabase.from('clash_pulse_snapshots').upsert({
      season_id: snapshot.seasonId, season_name: snapshot.seasonName,
      candidate_payload: snapshot.report, provenance: snapshot.provenance,
      generated_at: snapshot.generatedAt, generated_by: snapshot.generatedBy,
      refresh_trigger: snapshot.refreshTrigger,
    }, {onConflict: 'season_id'});
    if (error) throw new Error(`Pulse snapshot write failed: ${error.message}`);
  }
}
