'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

export async function muteMember(formData: FormData) {
  const targetProfileId = read(formData, 'targetProfileId');
  const returnTo = safeReturnTo(read(formData, 'returnTo'));
  if (!targetProfileId) redirect(returnTo);

  const {supabase, profileId} = await requireProfile();
  if (targetProfileId === profileId) redirect(returnTo);

  const {error} = await (supabase as any)
    .from('launch_profile_mutes')
    .upsert(
      {
        muter_profile_id: profileId,
        muted_profile_id: targetProfileId,
      },
      {onConflict: 'muter_profile_id,muted_profile_id'},
    );

  if (error) {
    console.error('Member could not be muted.', {profileId, targetProfileId, error: error.message});
  }

  refreshReturnPath(returnTo);
  revalidatePath('/account/mutes');
  redirect(returnTo);
}

export async function unmuteMember(formData: FormData) {
  const targetProfileId = read(formData, 'targetProfileId');
  const returnTo = safeReturnTo(read(formData, 'returnTo') || '/account/mutes');
  if (!targetProfileId) redirect(returnTo);

  const {supabase, profileId} = await requireProfile();
  const {error} = await (supabase as any)
    .from('launch_profile_mutes')
    .delete()
    .eq('muter_profile_id', profileId)
    .eq('muted_profile_id', targetProfileId);

  if (error) {
    console.error('Member could not be unmuted.', {profileId, targetProfileId, error: error.message});
  }

  refreshReturnPath(returnTo);
  revalidatePath('/account/mutes');
  redirect(returnTo);
}

async function requireProfile() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account');

  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('id,status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || profile.status !== 'Approved') redirect('/account');
  return {supabase, profileId: profile.id};
}

function refreshReturnPath(returnTo: string) {
  const path = returnTo.split('#')[0]?.split('?')[0] || '/';
  revalidatePath(path);
}

function safeReturnTo(value: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
