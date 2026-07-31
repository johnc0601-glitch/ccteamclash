import {PlayoffService} from '@/domain/playoffs/PlayoffService';
import {SupabasePlayoffRepository} from '@/domain/playoffs/SupabasePlayoffRepository';
import {createClient} from '@/lib/supabase/server';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {TeamService} from '@/services/TeamService';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {createServerStandingsService} from '@/core/createServerStandingsService';

export async function createServerPlayoffService(): Promise<PlayoffService> {
  const supabase = await createClient();
  return new PlayoffService(
    new SupabasePlayoffRepository(supabase),
    await createServerStandingsService(),
    await createServerScheduleService(),
    await createServerResultsService(),
    new TeamService(new SupabaseScheduleTeamRepository(supabase)),
  );
}
