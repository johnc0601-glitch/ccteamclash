import {LeagueService} from '@/domain/league/LeagueService';
import {SupabaseLeagueRepository} from '@/domain/league/SupabaseLeagueRepository';
import {createClient} from '@/lib/supabase/server';

export async function createServerLeagueService(): Promise<LeagueService> {
  const supabase = await createClient();
  return new LeagueService(new SupabaseLeagueRepository(supabase));
}
