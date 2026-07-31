import {SupabaseHistoricalPlayerMatchupRepository} from '@/domain/history/SupabaseHistoricalPlayerMatchupRepository';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {createClient} from '@/lib/supabase/server';
import {SupabasePlayerRepository} from '@/repositories/SupabasePlayerRepository';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {PlayerService} from '@/services/PlayerService';
import {PlayerMatchHistoryService} from '@/services/playerHistory/PlayerMatchHistoryService';
import {PublicPlayerService} from '@/services/public/PublicPlayerService';
import {StatisticsEngine} from '@/services/statistics';
import {SupabaseStatisticsRepository} from '@/services/statistics/SupabaseStatisticsRepository';
import {TeamService} from '@/services/TeamService';

export async function createServerPublicPlayerService(): Promise<PublicPlayerService> {
  const supabase = await createClient();
  const teams = new TeamService(new SupabaseScheduleTeamRepository(supabase));
  const players = new PlayerService(new SupabasePlayerRepository(supabase), teams);
  const seasons = new SeasonService(new SupabaseSeasonRepository(supabase));
  const statistics = new StatisticsEngine(new SupabaseStatisticsRepository(supabase));
  const completeHistory = new PlayerMatchHistoryService(
    statistics,
    new SupabaseHistoricalPlayerMatchupRepository(supabase),
  );
  return new PublicPlayerService(players, teams, seasons, statistics, completeHistory);
}
