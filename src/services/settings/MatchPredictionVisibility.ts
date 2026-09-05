import type {SupabaseClient} from '@supabase/supabase-js';
import {CCTEAMCLASH_LEAGUE_ID} from '@/domain/league/League';
import type {AttendanceActor} from '@/domain/match-roster/MatchAttendance';

export const MATCH_PREDICTION_VISIBILITIES = [
  'Public',
  'CaptainsCommissioner',
  'Commissioner',
] as const;

export type MatchPredictionVisibility = (typeof MATCH_PREDICTION_VISIBILITIES)[number];

export const DEFAULT_MATCH_PREDICTION_VISIBILITY: MatchPredictionVisibility = 'Public';

export async function getMatchPredictionVisibility(
  supabase: SupabaseClient<any>,
): Promise<MatchPredictionVisibility> {
  const {data, error} = await (supabase as any)
    .from('launch_league_settings')
    .select('matchup_prediction_visibility')
    .eq('league_id', CCTEAMCLASH_LEAGUE_ID)
    .maybeSingle();

  if (error) {
    console.error('Match prediction visibility setting is unavailable.', {
      error: error.message,
    });
    return DEFAULT_MATCH_PREDICTION_VISIBILITY;
  }

  const value = data?.matchup_prediction_visibility;
  return isMatchPredictionVisibility(value)
    ? value
    : DEFAULT_MATCH_PREDICTION_VISIBILITY;
}

export function canViewMatchPrediction(
  visibility: MatchPredictionVisibility,
  actor: Pick<AttendanceActor, 'profileStatus' | 'profileRole'> | undefined,
): boolean {
  if (visibility === 'Public') return true;

  const approved = actor?.profileStatus === 'Approved';
  if (!approved) return false;

  if (visibility === 'Commissioner') {
    return actor?.profileRole === 'Commissioner';
  }

  return actor?.profileRole === 'Commissioner' || actor?.profileRole === 'Captain';
}

export function isMatchPredictionVisibility(
  value: unknown,
): value is MatchPredictionVisibility {
  return typeof value === 'string'
    && MATCH_PREDICTION_VISIBILITIES.includes(value as MatchPredictionVisibility);
}
