import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {ArchivedStreakSource, ArchivedPlayerContest, ArchivedTeamMatch} from './PulseHistoricalStreaks';

/** Archived match and per-player contest records are immutable league history,
 * independent of currently published matchday source tables. */
export async function loadHistoricalStreakSource(client: SupabaseClient): Promise<ArchivedStreakSource> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = client as any;
  const {data: teams, error: teamError} = await db.from('historical_team_matches')
    .select('id,season_name,event_order,event_label,home_team_name,away_team_name,home_score,away_score')
    .order('id');
  if (teamError) throw teamError;

  const players: ArchivedPlayerContest[] = [];
  for (let from=0;;from+=500) {
    const {data, error} = await db.from('historical_player_matchups')
      .select('deduplication_key,season_id,event_order,historical_team_match_id,player_id,player_name,player_team_name,match_format,outcome,opponent_one_player_name,opponent_two_player_name')
      .order('season_id').order('event_order').order('historical_team_match_id')
      .order('player_id').order('deduplication_key')
      .range(from, from+499);
    if (error) throw error;
    players.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  return {teams: (teams ?? []) as ArchivedTeamMatch[], players};
}
