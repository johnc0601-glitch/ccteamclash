import {SeasonRosterService} from '@/domain/season-roster/SeasonRosterService';
import {SupabaseSeasonRosterRepository} from '@/domain/season-roster/SupabaseSeasonRosterRepository';
import {createClient} from '@/lib/supabase/server';

export async function createServerSeasonRosterService(): Promise<SeasonRosterService> {
  const supabase = await createClient();
  return new SeasonRosterService(new SupabaseSeasonRosterRepository(supabase));
}
