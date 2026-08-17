'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

const APPLICATIONS_PATH = '/office/applications';

export async function approveApplication(formData: FormData) {
  await reviewApplication(formData, 'Approved', 'Application approved.');
}

export async function rejectApplication(formData: FormData) {
  await reviewApplication(formData, 'Rejected', 'Application rejected.');
}

async function reviewApplication(
  formData: FormData,
  status: 'Approved' | 'Rejected',
  notice: string,
) {
  const applicationId = readFormValue(formData, 'applicationId');
  if (!applicationId) {
    redirect(`${APPLICATIONS_PATH}?error=${encodeURIComponent('Application is required.')}`);
  }

  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/account?error=Sign%20in%20first.');
  }

  const {error} = await supabase.rpc('review_launch_player_application', {
    target_application_id: applicationId,
    target_status: status,
  });

  if (error) {
    redirect(`${APPLICATIONS_PATH}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(APPLICATIONS_PATH);
  revalidatePath('/office/players');
  revalidatePath('/players');
  revalidatePath('/account');
  redirect(`${APPLICATIONS_PATH}?notice=${encodeURIComponent(notice)}`);
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
