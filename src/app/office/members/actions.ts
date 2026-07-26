'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {LaunchService} from '@/domain/launch/LaunchService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export async function approveClaim(formData: FormData) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const claimId = readFormValue(formData, 'claimId');
  const playerId = readFormValue(formData, 'playerId');
  if (!claimId) redirect('/office/members?error=Claim is required.');

  const result = await service.approvePlayerClaim(claimId, commissionerProfileId, playerId);
  if (!result.ok) redirect(`/office/members?error=${encodeURIComponent(result.message)}`);

  revalidatePath('/office/members');
  redirect('/office/members?notice=Player claim approved.');
}

export async function rejectClaim(formData: FormData) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const claimId = readFormValue(formData, 'claimId');
  if (!claimId) redirect('/office/members?error=Claim is required.');

  const result = await service.rejectPlayerClaim(claimId, commissionerProfileId);
  if (!result.ok) redirect(`/office/members?error=${encodeURIComponent(result.message)}`);

  revalidatePath('/office/members');
  redirect('/office/members?notice=Player claim rejected.');
}

export async function approveProfile(formData: FormData) {
  await setProfileStatus(formData, 'Approved', 'Profile approved.');
}

export async function rejectProfile(formData: FormData) {
  await setProfileStatus(formData, 'Rejected', 'Profile rejected.');
}

export async function suspendProfile(formData: FormData) {
  await setProfileStatus(formData, 'Suspended', 'Profile suspended.');
}

export async function assignCaptain(formData: FormData) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const profileId = readFormValue(formData, 'profileId');
  const teamId = readFormValue(formData, 'teamId') || null;
  if (!profileId) redirect('/office/members?error=Profile is required.');

  const result = await service.assignCaptainTeam(profileId, teamId, commissionerProfileId);
  if (!result.ok) redirect(`/office/members?error=${encodeURIComponent(result.message)}`);

  revalidatePath('/office/members');
  redirect(`/office/members?notice=${encodeURIComponent(teamId ? 'Captain access updated.' : 'Captain access removed.')}`);
}

async function setProfileStatus(formData: FormData, status: 'Approved' | 'Rejected' | 'Suspended', notice: string) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const profileId = readFormValue(formData, 'profileId');
  if (!profileId) redirect('/office/members?error=Profile is required.');

  const result = await service.setProfileStatus(profileId, status, commissionerProfileId);
  if (!result.ok) redirect(`/office/members?error=${encodeURIComponent(result.message)}`);

  revalidatePath('/office/members');
  redirect(`/office/members?notice=${encodeURIComponent(notice)}`);
}

async function getCommissionerService() {
  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/account?error=Sign in first.');

  const repository = new SupabaseLaunchRepository(supabase);
  const commissionerProfile = await repository.getProfileByUserId(data.user.id);
  if (!commissionerProfile) redirect('/account?error=Create your league profile first.');

  return {
    commissionerProfileId: commissionerProfile.id,
    service: new LaunchService(repository),
  };
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
