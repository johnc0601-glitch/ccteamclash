'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

type CaptainReviewClient = {
  rpc: (
    fn: 'captain_review_launch_player_application',
    args: {
      target_application_id: string;
      target_status: 'Approved' | 'Rejected';
      target_gender: string | null;
      target_player_type: string | null;
    },
  ) => Promise<{error: {message: string} | null}>;
};

type CaptainReturnClient = {
  rpc: (
    fn: 'captain_return_rostered_player_to_commissioner',
    args: {target_player_id: string},
  ) => Promise<{error: {message: string} | null}>;
};

export async function confirmTeamApplication(formData: FormData) {
  await reviewTeamApplication(formData, 'Approved');
}

export async function rejectTeamApplication(formData: FormData) {
  await reviewTeamApplication(formData, 'Rejected');
}

export async function returnRosteredPlayerToCommissioner(formData: FormData) {
  const playerId = readFormValue(formData, 'playerId');
  if (!playerId) redirect('/captain?error=Player is required.');

  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/account?error=Sign in first.');

  const {error: returnError} = await (supabase as unknown as CaptainReturnClient).rpc(
    'captain_return_rostered_player_to_commissioner',
    {target_player_id: playerId},
  );
  if (returnError) redirect(`/captain?error=${encodeURIComponent(returnError.message)}`);

  revalidatePath('/captain');
  revalidatePath('/office/players');
  revalidatePath('/players');
  revalidatePath('/account');
  revalidatePath('/teams');
  redirect(`/captain?notice=${encodeURIComponent('Player removed from your roster and sent to the commissioner for review.')}`);
}

async function reviewTeamApplication(formData: FormData, status: 'Approved' | 'Rejected') {
  const applicationId = readFormValue(formData, 'applicationId');
  if (!applicationId) redirect('/captain?error=Registration is required.');

  const gender = status === 'Approved' ? readFormValue(formData, 'gender') : '';
  const playerType = status === 'Approved' ? readFormValue(formData, 'playerType') : '';
  if (status === 'Approved' && gender !== 'Male' && gender !== 'Female') {
    redirect('/captain?error=Choose Male or Female before approving.');
  }
  if (status === 'Approved' && playerType !== 'Adult' && playerType !== 'Junior') {
    redirect('/captain?error=Player type must be Adult or Junior.');
  }

  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/account?error=Sign in first.');

  const {error: reviewError} = await (supabase as unknown as CaptainReviewClient).rpc(
    'captain_review_launch_player_application',
    {
      target_application_id: applicationId,
      target_status: status,
      target_gender: status === 'Approved' ? gender : null,
      target_player_type: status === 'Approved' ? playerType : null,
    },
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
