import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database';
import type {TeamStrengthPredictionSnapshot} from './PredictionSnapshot';
import {TEAM_STRENGTH_VERSION} from './TeamStrength';
import type {TeamStrengthSource} from './RosterStrength';

export interface PredictionSnapshotRepository {
  saveIfAbsent(snapshots: readonly TeamStrengthPredictionSnapshot[]): Promise<void>;
}

/** Read-only contract used by public display and post-match calibration analysis. */
export interface PredictionSnapshotReader {
  findHomeSnapshot(
    matchId: string,
    source: TeamStrengthSource,
    modelVersion?: string,
  ): Promise<TeamStrengthPredictionSnapshot | undefined>;
  findHomeMatchLineupSnapshot(
    matchId: string,
    modelVersion?: string,
  ): Promise<TeamStrengthPredictionSnapshot | undefined>;
}

export type PredictionSnapshotInsert = {
  match_id: string;
  team_id: string;
  opponent_team_id: string;
  side: TeamStrengthPredictionSnapshot['side'];
  source: TeamStrengthPredictionSnapshot['source'];
  capture_reason: TeamStrengthPredictionSnapshot['captureReason'];
  strength_label: string;
  model_version: string;
  captured_at: string;
  venue: TeamStrengthPredictionSnapshot['venue'];
  confidence: TeamStrengthPredictionSnapshot['confidence'];
  prediction_readiness: TeamStrengthPredictionSnapshot['predictionReadiness'];
  calibration_slope: number;
  team_base_strength: number;
  opponent_base_strength: number;
  matchup_strength_difference: number;
  expected_point_share: number;
  chance_of_victory: number;
  team_player_ids: string[];
  opponent_player_ids: string[];
  team_player_clash_indexes: TeamStrengthPredictionSnapshot['teamPlayerClashIndexes'];
  opponent_player_clash_indexes: TeamStrengthPredictionSnapshot['opponentPlayerClashIndexes'];
  team_player_count: number;
  opponent_player_count: number;
  team_female_player_count: number;
  opponent_female_player_count: number;
  team_male_player_count: number;
  opponent_male_player_count: number;
  team_unknown_gender_player_count: number;
  opponent_unknown_gender_player_count: number;
  team_standard_player_shortfall: number;
  opponent_standard_player_shortfall: number;
  team_provisional_player_count: number;
  opponent_provisional_player_count: number;
  team_fallback_player_count: number;
  opponent_fallback_player_count: number;
  team_omitted_player_count: number;
  opponent_omitted_player_count: number;
};

/**
 * Service-role repository for immutable Team Strength calibration snapshots.
 * Duplicate lifecycle captures are ignored rather than updated, preserving the
 * first point-in-time observation for a stage/model pair.
 *
 * The generated Database type does not include the staged table until the
 * migration lands, so the table call is deliberately isolated behind one
 * narrow cast instead of widening the rest of the Team Strength code.
 */
export class SupabasePredictionSnapshotRepository implements
  PredictionSnapshotRepository,
  PredictionSnapshotReader {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async saveIfAbsent(snapshots: readonly TeamStrengthPredictionSnapshot[]): Promise<void> {
    if (!snapshots.length) return;

    const snapshotClient = this.supabase as any;
    const {error} = await snapshotClient
      .from('team_strength_prediction_snapshots')
      .upsert(snapshots.map(toPredictionSnapshotInsert), {
        onConflict: 'match_id,side,source,model_version',
        ignoreDuplicates: true,
      });

    if (error) throw error;
  }

  async findHomeSnapshot(
    matchId: string,
    source: TeamStrengthSource,
    modelVersion: string = TEAM_STRENGTH_VERSION,
  ): Promise<TeamStrengthPredictionSnapshot | undefined> {
    const normalizedMatchId = matchId.trim();
    const normalizedModelVersion = modelVersion.trim();
    if (!normalizedMatchId || !normalizedModelVersion) return undefined;

    const snapshotClient = this.supabase as any;
    const {data, error} = await snapshotClient
      .from('team_strength_prediction_snapshots')
      .select('*')
      .eq('match_id', normalizedMatchId)
      .eq('side', 'Home')
      .eq('source', source)
      .eq('model_version', normalizedModelVersion)
      .maybeSingle();

    if (error) throw error;
    if (!data) return undefined;

    return fromPredictionSnapshotRow(data as PredictionSnapshotInsert);
  }

  async findHomeMatchLineupSnapshot(
    matchId: string,
    modelVersion: string = TEAM_STRENGTH_VERSION,
  ): Promise<TeamStrengthPredictionSnapshot | undefined> {
    return this.findHomeSnapshot(matchId, 'matchLineup', modelVersion);
  }
}

export function toPredictionSnapshotInsert(
  snapshot: TeamStrengthPredictionSnapshot,
): PredictionSnapshotInsert {
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
    team_player_clash_indexes: snapshot.teamPlayerClashIndexes,
    opponent_player_clash_indexes: snapshot.opponentPlayerClashIndexes,
    team_player_count: snapshot.teamPlayerCount,
    opponent_player_count: snapshot.opponentPlayerCount,
    team_female_player_count: snapshot.teamFemalePlayerCount,
    opponent_female_player_count: snapshot.opponentFemalePlayerCount,
    team_male_player_count: snapshot.teamMalePlayerCount,
    opponent_male_player_count: snapshot.opponentMalePlayerCount,
    team_unknown_gender_player_count: snapshot.teamUnknownGenderPlayerCount,
    opponent_unknown_gender_player_count: snapshot.opponentUnknownGenderPlayerCount,
    team_standard_player_shortfall: snapshot.teamStandardPlayerShortfall,
    opponent_standard_player_shortfall: snapshot.opponentStandardPlayerShortfall,
    team_provisional_player_count: snapshot.teamProvisionalPlayerCount,
    opponent_provisional_player_count: snapshot.opponentProvisionalPlayerCount,
    team_fallback_player_count: snapshot.teamFallbackPlayerCount,
    opponent_fallback_player_count: snapshot.opponentFallbackPlayerCount,
    team_omitted_player_count: snapshot.teamOmittedPlayerCount,
    opponent_omitted_player_count: snapshot.opponentOmittedPlayerCount,
  };
}

/** Converts the persisted snake-case row back into the immutable snapshot shape. */
export function fromPredictionSnapshotRow(
  row: PredictionSnapshotInsert,
): TeamStrengthPredictionSnapshot {
  return {
    matchId: row.match_id,
    teamId: row.team_id,
    opponentTeamId: row.opponent_team_id,
    side: row.side,
    source: row.source,
    captureReason: row.capture_reason,
    strengthLabel: row.strength_label,
    modelVersion: row.model_version,
    capturedAt: row.captured_at,
    venue: row.venue,
    confidence: row.confidence,
    predictionReadiness: row.prediction_readiness,
    calibrationSlope: row.calibration_slope,
    teamBaseStrength: row.team_base_strength,
    opponentBaseStrength: row.opponent_base_strength,
    matchupStrengthDifference: row.matchup_strength_difference,
    expectedPointShare: row.expected_point_share,
    chanceOfVictory: row.chance_of_victory,
    teamPlayerIds: [...row.team_player_ids],
    opponentPlayerIds: [...row.opponent_player_ids],
    teamPlayerClashIndexes: row.team_player_clash_indexes.map(({playerId, clashIndex}) => ({
      playerId,
      clashIndex,
    })),
    opponentPlayerClashIndexes: row.opponent_player_clash_indexes.map(
      ({playerId, clashIndex}) => ({playerId, clashIndex}),
    ),
    teamPlayerCount: row.team_player_count,
    opponentPlayerCount: row.opponent_player_count,
    teamFemalePlayerCount: row.team_female_player_count,
    opponentFemalePlayerCount: row.opponent_female_player_count,
    teamMalePlayerCount: row.team_male_player_count,
    opponentMalePlayerCount: row.opponent_male_player_count,
    teamUnknownGenderPlayerCount: row.team_unknown_gender_player_count,
    opponentUnknownGenderPlayerCount: row.opponent_unknown_gender_player_count,
    teamStandardPlayerShortfall: row.team_standard_player_shortfall,
    opponentStandardPlayerShortfall: row.opponent_standard_player_shortfall,
    teamProvisionalPlayerCount: row.team_provisional_player_count,
    opponentProvisionalPlayerCount: row.opponent_provisional_player_count,
    teamFallbackPlayerCount: row.team_fallback_player_count,
    opponentFallbackPlayerCount: row.opponent_fallback_player_count,
    teamOmittedPlayerCount: row.team_omitted_player_count,
    opponentOmittedPlayerCount: row.opponent_omitted_player_count,
  };
}
