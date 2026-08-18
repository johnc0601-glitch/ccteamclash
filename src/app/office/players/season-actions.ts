'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

const PLAYERS_PATH = '/office/players';

type ReviewClient = {
  rpc: (
    fn:
      | 'commissioner_reopen_launch_player_application'
      | 'commissioner_change_rejected_launch_player_application_team'
      | 'commissioner_delete_rejected_launch_player_application',
    args: Record<string, string>,
  ) => Promise<{error: {message: string} | null}>;
};

export async function commissionerReopenRegistration(formData: FormData) {
  const applicationId = readFormValue(formData, 'applicationId');
  if (!applicationId) redirect(`${PLAYERS_PATH}?error=Season registration is required.`);

  const supabase = await requireCommissioner();
  const {error} = await (supabase as unknown as ReviewClient).rpc(
    'commissioner_reopen_launch_player_application',
    {target_application_id: applicationId},
  );
  if (error) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(error.message)}`);

  revalidateReviewPages();
  redirect(`${PLAYERS_PATH}?notice=${encodeURIComponent('Registration sent back to the same team captain.')}`);
}

export async function commissionerChangeRejectedRegistrationTeam(formData: FormData) {
  const applicationId = readFormValue(formData, 'applicationId');
  const requestedTeamId = readFormValue(formData, 'requestedTeamId');
  if (!applicationId) redirect(`${PLAYERS_PATH}?error=Season registration is required.`);
  if (!requestedTeamId) redirect(`${PLAYERS_PATH}?error=Choose a new team.`);

  const supabase = await requireCommissioner();
  const {error} = await (supabase as unknown as ReviewClient).rpc(
    'commissioner_change_rejected_launch_player_application_team',
    {target_application_id: applicationId, target_requested_team_id: requestedTeamId},
  );
  if (error) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(error.message)}`);

  revalidateReviewPages();
  redirect(`${PLAYERS_PATH}?notice=${encodeURIComponent('Team changed. Registration sent to the new team captain.')}`);
}

export async function commissionerDeleteRejectedRegistration(formData: FormData) {
  const applicationId = readFormValue(formData, 'applicationId');
  if (!applicationId) redirect(`${PLAYERS_PATH}?error=Season registration is required.`);

  const supabase = await requireCommissioner();
  const {error} = await (supabase as unknown as ReviewClient).rpc(
    'commissioner_delete_rejected_launch_player_application',
    {target_application_id: applicationId},
  );
  if (error) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(error.message)}`);

  revalidateReviewPages();
  redirect(`${PLAYERS_PATH}?notice=${encodeURIComponent('Season registration deleted. Account and player record were kept.')}`);
}

async function requireCommissioner() {
  const supabase = await createClient();
  const {data: {user}, error} = await supabase.auth.getUser();
  if (error || !user) redirect('/account?error=Sign in first.');

  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);
  if (!profile || profile.role !== 'Commissioner' || profile.status !== 'Approved') {
    redirect(`${PLAYERS_PATH}?error=${encodeURIComponent('Approved commissioner access is required.')}`);
  }
  return supabase;
}

function revalidateReviewPages() {
  revalidatePath(PLAYERS_PATH);
  revalidatePath('/captain');
  revalidatePath('/account');
  revalidatePath('/players');
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
