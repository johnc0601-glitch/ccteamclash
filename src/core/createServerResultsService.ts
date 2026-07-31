import {ResultsService} from '@/domain/results/ResultsService';
import {SupabaseResultsRepository} from '@/domain/results/SupabaseResultsRepository';
import {SupabaseScheduleRepository} from '@/domain/schedule/SupabaseScheduleRepository';
import {createClient} from '@/lib/supabase/server';

export async function createServerResultsService(): Promise<ResultsService> {
  const supabase = await createClient();
  return new ResultsService(
    new SupabaseResultsRepository(supabase),
    new SupabaseScheduleRepository(supabase),
  );
}
