import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {createPublicClient} from '@/lib/supabase/public';
import {SupabasePlayerRepository} from '@/repositories/SupabasePlayerRepository';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {PlayerService} from '@/services/PlayerService';
import {StatisticsEngine} from '@/services/statistics';
import {SupabaseStatisticsRepository} from '@/services/statistics/SupabaseStatisticsRepository';
import {StatsQueryService} from '@/services/stats/StatsQueryService';
import {TeamService} from '@/services/TeamService';

/** Public, cookie-free Stats query service for shared cacheable reads. */
export function createPublicStatsQueryService(): StatsQueryService {
  const supabase = createPublicClient();
  const teams = new TeamService(new SupabaseScheduleTeamRepository(supabase));
  const players = new PlayerService(new SupabasePlayerRepository(supabase), teams);
  const seasons = new SeasonService(new SupabaseSeasonRepository(supabase));
  const statistics = new StatisticsEngine(new SupabaseStatisticsRepository(supabase));
  return new StatsQueryService(players, teams, seasons, statistics);
}
