'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {LaunchService} from '@/domain/launch/LaunchService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export async function confirmTeamClaim(formData: FormData) {
  const claimId = readFormValue(formData, 'claimId');
  if (!claimId) redirect('/captain?error=Claim is required.');

  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/account?error=Sign in first.');

  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(data.user.id);
  if (!profile) redirect('/account?error=Create your league profile first.');

  const result = await new LaunchService(repository).confirmTeamPlayerClaim(claimId, profile.id);
  if (!result.ok) redirect(`/captain?error=${encodeURIComponent(result.message)}`);

  revalidatePath('/captain');
  revalidatePath('/office/players');
  revalidatePath('/account');
  redirect('/captain?notice=Player confirmed for your roster.');
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
