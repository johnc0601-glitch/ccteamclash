import {PlayerApplicationService} from '@/domain/player-application/PlayerApplicationService';
import {SupabasePlayerApplicationRepository} from '@/domain/player-application/SupabasePlayerApplicationRepository';
import {createClient} from '@/lib/supabase/server';

export async function createServerPlayerApplicationService(): Promise<PlayerApplicationService> {
  const supabase = await createClient();
  return new PlayerApplicationService(new SupabasePlayerApplicationRepository(supabase));
}
