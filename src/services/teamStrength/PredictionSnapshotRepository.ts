import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database';
import type {TeamStrengthPredictionSnapshot} from './PredictionSnapshot';

export interface PredictionSnapshotRepository {
  saveIfAbsent(snapshots: readonly TeamStrengthPredictionSnapshot[]): Promise<void>;
}

type SnapshotInsert = {
  match_id: string;
  team_id: string;
  opponent_team_id: string;
  side: string;
  source: string;
  capture_reason: string;
  strength_label: string;
  model_version: string;
  captured_at: string;
  venue: string;
  confidence: string;
  prediction_readiness: string;
  calibration_slope: number;
  team_base_strength: number;
  opponent_base_strength: number;
  matchup_strength_difference: number;
  expected_point_share: number;
  chance_of_victory: number;
  team_player_ids: string[];
  opponent_player_ids: string[];
  team_player_count: number;
  opponent_player_count: number;
  team_provisional_player_count: number;
  opponent_provisional_player_count: number;
  team_fallback_player_count: number;
  opponent_fallback_player_count: number;
  team_omitted_player_count: number;
  opponent_omitted_player_count: number;
};

type SnapshotRow = SnapshotInsert & {id: number};

type SnapshotDatabase = {
  public: {
    Tables: {
      team_strength_prediction_snapshots: {
        Row: SnapshotRow;
        Insert: SnapshotInsert;
        Update: Partial<SnapshotInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/**
 * Service-role repository for immutable Team Strength calibration snapshots.
 * Duplicate lifecycle captures are ignored rather than updated, preserving the
 * first point-in-time observation for a stage/model pair.
 */
export class SupabasePredictionSnapshotRepository implements PredictionSnapshotRepository {
  private readonly snapshotClient: SupabaseClient<SnapshotDatabase>;

  constructor(supabase: SupabaseClient<Database>) {
    this.snapshotClient = supabase as unknown as SupabaseClient<SnapshotDatabase>;
  }

  async saveIfAbsent(snapshots: readonly TeamStrengthPredictionSnapshot[]): Promise<void> {
    if (!snapshots.length) return;

    const {error} = await this.snapshotClient
      .from('team_strength_prediction_snapshots')
      .upsert(snapshots.map(toInsert), {
        onConflict: 'match_id,side,source,model_version',
        ignoreDuplicates: true,
      });

    if (error) throw error;
  }
}

export function toPredictionSnapshotInsert(
  snapshot: TeamStrengthPredictionSnapshot,
): SnapshotInsert {
  return toInsert(snapshot);
}

function toInsert(snapshot: TeamStrengthPredictionSnapshot): SnapshotInsert {
  return {
    match_id: snapshot.matchId,
    team_id: snapshot.teamId,
    opponent_team_id: snapshot.opponentTeamId,
    side: snapshot.side,
    source: snapshot.source,
    capture_reason: snapshot.captureReason,
    strength_label: snapshot.strengthLabel,
    model_version: snapshot.modelVersion,
    captured_at: snapshot.capturedAt,
    venue: snapshot.venue,
    confidence: snapshot.confidence,
    prediction_readiness: snapshot.predictionReadiness,
    calibration_slope: snapshot.calibrationSlope,
    team_base_strength: snapshot.teamBaseStrength,
    opponent_base_strength: snapshot.opponentBaseStrength,
    matchup_strength_difference: snapshot.matchupStrengthDifference,
    expected_point_share: snapshot.expectedPointShare,
    chance_of_victory: snapshot.chanceOfVictory,
    team_player_ids: snapshot.teamPlayerIds,
    opponent_player_ids: snapshot.opponentPlayerIds,
    team_player_count: snapshot.teamPlayerCount,
    opponent_player_count: snapshot.opponentPlayerCount,
    team_provisional_player_count: snapshot.teamProvisionalPlayerCount,
    opponent_provisional_player_count: snapshot.opponentProvisionalPlayerCount,
    team_fallback_player_count: snapshot.teamFallbackPlayerCount,
    opponent_fallback_player_count: snapshot.opponentFallbackPlayerCount,
    team_omitted_player_count: snapshot.teamOmittedPlayerCount,
    opponent_omitted_player_count: snapshot.opponentOmittedPlayerCount,
  };
}
