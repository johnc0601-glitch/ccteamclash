'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

type CaptainReviewClient = {
  rpc: (
    fn: 'captain_review_launch_player_application',
    args: {target_application_id: string; target_status: 'Approved' | 'Rejected'},
  ) => Promise<{error: {message: string} | null}>;
};

export async function confirmTeamApplication(formData: FormData) {
  await reviewTeamApplication(formData, 'Approved');
}

export async function rejectTeamApplication(formData: FormData) {
  await reviewTeamApplication(formData, 'Rejected');
}

async function reviewTeamApplication(formData: FormData, status: 'Approved' | 'Rejected') {
  const applicationId = readFormValue(formData, 'applicationId');
  if (!applicationId) redirect('/captain?error=Registration is required.');

  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/account?error=Sign in first.');

  const {error: reviewError} = await (supabase as unknown as CaptainReviewClient).rpc(
    'captain_review_launch_player_application',
    {target_application_id: applicationId, target_status: status},
  );
  if (reviewError) redirect(`/captain?error=${encodeURIComponent(reviewError.message)}`);

  revalidatePath('/captain');
  revalidatePath('/office/players');
  revalidatePath('/players');
  revalidatePath('/account');
  redirect(`/captain?notice=${encodeURIComponent(
    status === 'Approved' ? 'Player approved and added to your roster.' : 'Season registration rejected.',
  )}`);
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
