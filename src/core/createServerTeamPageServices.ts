import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {StatisticsEngine} from '@/services/statistics';
import {SupabaseStatisticsRepository} from '@/services/statistics/SupabaseStatisticsRepository';

export type ServerTeamPageServices = {
  seasons: SeasonService;
  statistics: StatisticsEngine;
};

export async function createServerTeamPageServices(): Promise<ServerTeamPageServices | null> {
  if (!hasSupabaseConfig()) return null;

  const supabase = await createClient();
  return {
    seasons: new SeasonService(new SupabaseSeasonRepository(supabase)),
    statistics: new StatisticsEngine(new SupabaseStatisticsRepository(supabase)),
  };
}
