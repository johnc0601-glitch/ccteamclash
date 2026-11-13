import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database';
import type {TeamStrengthSource} from './RosterStrength';
import type {PredictionReadiness} from './MatchPrediction';
import type {TeamStrengthConfidence} from './TeamStrength';
import type {PublicMatchPrediction} from './PublicMatchPrediction';
import {TEAM_STRENGTH_STAGE_LABELS} from './RosterStrength';
import {easternDate} from '@/services/weather/MatchWeather';

// Only use a persisted prediction captured before matchday. A date-only cutoff
// is deliberately conservative when historical tee times are absent or mutable.
export function savedPrediction(row: Record<string, unknown>, date: string, homeId: string, awayId: string): PublicMatchPrediction | undefined {
  const captured = new Date(typeof row.captured_at === 'string' ? row.captured_at : '');
  if (!Number.isFinite(captured.getTime()) || easternDate(captured) >= date
    || row.team_id !== homeId || row.opponent_team_id !== awayId || row.side !== 'Home'
    || !['Unavailable', 'EarlyEstimate', 'Ready'].includes(String(row.prediction_readiness))
    || !['activeRoster', 'confirmedAvailableRoster', 'matchLineup'].includes(String(row.source))
    || typeof row.chance_of_victory !== 'number' || !Number.isFinite(row.chance_of_victory) || row.chance_of_victory < 0 || row.chance_of_victory > 1) return undefined;
  const unavailable = row.prediction_readiness === 'Unavailable';
  return {
    state: 'calculated', source: row.source as TeamStrengthSource, stageLabel: TEAM_STRENGTH_STAGE_LABELS[row.source as keyof typeof TEAM_STRENGTH_STAGE_LABELS],
    strengthLabel: String(row.strength_label ?? 'CI'), displayLabel: unavailable ? 'Prediction unavailable' : 'Early estimate',
    readiness: row.prediction_readiness as PredictionReadiness, confidence: row.confidence as TeamStrengthConfidence,
    awayStrength: Number(row.opponent_base_strength), homeStrength: Number(row.team_base_strength),
    homeChanceOfVictory: unavailable ? null : row.chance_of_victory,
    awayChanceOfVictory: unavailable ? null : 1 - row.chance_of_victory,
    venueNote: '', updateNote: captured.toISOString(),
  };
}

export async function loadSavedMatchPrediction(client: SupabaseClient<Database>, matchId: string, date: string, homeId: string, awayId: string) {
  // This staged table is not yet present in generated Database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapshotClient = client as any;
  const {data, error} = await snapshotClient.from('team_strength_prediction_snapshots').select('*')
    .eq('match_id', matchId).eq('side', 'Home').order('captured_at', {ascending: false});
  if (error) return undefined;
  for (const row of data ?? []) {
    const prediction = savedPrediction(row, date, homeId, awayId);
    if (prediction) return prediction;
  }
  return undefined;
}
