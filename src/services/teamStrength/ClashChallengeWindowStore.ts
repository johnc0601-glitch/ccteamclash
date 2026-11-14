import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import type {ClashChallengeWindow} from './ClashChallengeWindows';

/** Server-only access: public visitors never receive the admin windows table. */
export async function loadClashChallengeWindow(roundId: string): Promise<ClashChallengeWindow | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const db = createAdminClient() as any;
  const {data, error} = await db.from('launch_clash_challenge_windows')
    .select('opens_at,closes_at').eq('round_id',roundId).maybeSingle();
  if (error) {
    console.error('Clash Challenge window unavailable.',{roundId,errorCode:error.code});
    return null;
  }
  if (!data) return null;
  return {opensAt:data.opens_at,closesAt:data.closes_at};
}
