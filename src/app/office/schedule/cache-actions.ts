'use server';

import {revalidatePath, revalidateTag} from 'next/cache';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export async function refreshPublicSchedule(matchId: string): Promise<void> {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) throw new Error('Commissioner sign-in required.');

  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);
  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    throw new Error('Approved commissioner access is required.');
  }

  revalidateTag('public:schedule', 'max');
  revalidateTag('public:homepage', 'max');
  revalidatePath('/');
  revalidatePath('/schedule');
  if (matchId) revalidatePath(`/matches/${encodeURIComponent(matchId)}`);
}
