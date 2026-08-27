import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {createClient} from '@/lib/supabase/server';
import {SupabasePlayerRepository} from '@/repositories/SupabasePlayerRepository';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {PlayerService} from '@/services/PlayerService';
import {StatsQueryService} from '@/services/stats/StatsQueryService';
import {StatisticsEngine} from '@/services/statistics';
import {SupabaseStatisticsRepository} from '@/services/statistics/SupabaseStatisticsRepository';
import {TeamService} from '@/services/TeamService';

export async function createServerStatsQueryService(): Promise<StatsQueryService> {
  const supabase = await createClient();
  const teams = new TeamService(new SupabaseScheduleTeamRepository(supabase));
  const players = new PlayerService(new SupabasePlayerRepository(supabase), teams);
  const seasons = new SeasonService(new SupabaseSeasonRepository(supabase));
  const statistics = new StatisticsEngine(new SupabaseStatisticsRepository(supabase));
  return new StatsQueryService(players, teams, seasons, statistics);
}
