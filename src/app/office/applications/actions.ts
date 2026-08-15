'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createServerPlayerApplicationService} from '@/core/createServerPlayerApplicationService';
import {playerApplicationReviewActionError} from '@/domain/player-application/PlayerApplicationReviewActionMessage';
import {createClient} from '@/lib/supabase/server';

const APPLICATIONS_PATH = '/office/applications';

export async function approvePlayerApplication(formData: FormData) {
  await reviewIdentity(formData, 'Approved');
}

export async function rejectPlayerApplication(formData: FormData) {
  await reviewIdentity(formData, 'Rejected');
}

async function reviewIdentity(formData: FormData, status: 'Approved' | 'Rejected') {
  const applicationId = readValue(formData, 'applicationId');
  if (!applicationId) redirectWithError('Application is required.');

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account?error=Please%20sign%20in%20to%20continue.');

  try {
    const applicationService = await createServerPlayerApplicationService();
    const reviewed = await applicationService.reviewApplication(applicationId, status);
    if (!reviewed.ok) throw new Error(reviewed.message);
  } catch (error) {
    redirectWithError(playerApplicationReviewActionError(error));
  }

  revalidatePath(APPLICATIONS_PATH);
  revalidatePath('/office/players');
  revalidatePath('/account');
  redirect(`${APPLICATIONS_PATH}?notice=${encodeURIComponent(`Application ${status.toLowerCase()}. Roster placement remains separate.`)}`);
}

function readValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function redirectWithError(message: string): never {
  redirect(`${APPLICATIONS_PATH}?error=${encodeURIComponent(message)}`);
}
