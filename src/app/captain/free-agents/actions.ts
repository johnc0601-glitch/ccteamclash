'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

type CaptainFreeAgentClient = {
  rpc: (
    fn: 'captain_claim_launch_free_agent',
    args: {target_application_id: string},
  ) => Promise<{error: {message: string} | null}>;
};

export async function claimFreeAgent(formData: FormData) {
  const applicationId = readFormValue(formData, 'applicationId');
  if (!applicationId) redirect('/captain/free-agents?error=Free agent application is required.');

  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) redirect('/account?error=Sign in first.');

  const {error} = await (supabase as unknown as CaptainFreeAgentClient).rpc(
    'captain_claim_launch_free_agent',
    {target_application_id: applicationId},
  );
  if (error) redirect(`/captain/free-agents?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/captain/free-agents');
  revalidatePath('/captain');
  revalidatePath('/account');
  revalidatePath('/office/players');
  redirect(`/captain?notice=${encodeURIComponent('Free agent moved to your team requests. Review and approve the player below.')}`);
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
