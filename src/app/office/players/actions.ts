'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {LaunchService} from '@/domain/launch/LaunchService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

const PLAYERS_PATH = '/office/players';

export async function savePlayer(formData: FormData) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const playerId = readFormValue(formData, 'playerId') || undefined;
  const name = readFormValue(formData, 'name');
  const gender = readGender(readFormValue(formData, 'gender'));
  const pdgaNumber = readFormValue(formData, 'pdgaNumber');
  const pdgaRating = readRating(readFormValue(formData, 'pdgaRating'));
  const currentTeamId = readFormValue(formData, 'currentTeamId') || null;
  const active = readFormValue(formData, 'active') === 'true';

  const result = await service.savePlayer({
    playerId,
    name,
    gender,
    pdgaNumber,
    pdgaRating,
    currentTeamId,
    active,
  }, commissionerProfileId);

  if (!result.ok) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(result.message)}`);

  revalidatePeoplePages();
  redirect(`${PLAYERS_PATH}?notice=${encodeURIComponent(playerId ? 'Player updated.' : 'Player created.')}`);
}

export async function approveClaim(formData: FormData) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const claimId = readFormValue(formData, 'claimId');
  const playerId = readFormValue(formData, 'playerId');
  if (!claimId) redirect(`${PLAYERS_PATH}?error=Claim is required.`);

  const result = await service.approvePlayerClaim(claimId, commissionerProfileId, playerId);
  if (!result.ok) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(result.message)}`);

  revalidatePeoplePages();
  redirect(`${PLAYERS_PATH}?notice=Player claim approved.`);
}

export async function rejectClaim(formData: FormData) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const claimId = readFormValue(formData, 'claimId');
  if (!claimId) redirect(`${PLAYERS_PATH}?error=Claim is required.`);

  const result = await service.rejectPlayerClaim(claimId, commissionerProfileId);
  if (!result.ok) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(result.message)}`);

  revalidatePeoplePages();
  redirect(`${PLAYERS_PATH}?notice=Player claim rejected.`);
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

export async function deleteAccount(formData: FormData) {
  const profileId = readFormValue(formData, 'profileId');
  if (!profileId) redirect(`${PLAYERS_PATH}?error=Profile is required.`);

  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) redirect('/account?error=Sign in first.');

  const repository = new SupabaseLaunchRepository(supabase);
  const commissionerProfile = await repository.getProfileByUserId(user.id);
  if (!commissionerProfile || commissionerProfile.role !== 'Commissioner' || commissionerProfile.status !== 'Approved') {
    redirect(`${PLAYERS_PATH}?error=${encodeURIComponent('Approved commissioner access is required.')}`);
  }

  const {error} = await supabase.rpc('commissioner_delete_launch_account' as never, {
    target_profile_id: profileId,
  } as never);
  if (error) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(error.message)}`);

  revalidatePeoplePages();
  revalidatePath('/captain');
  revalidatePath('/account');
  redirect(`${PLAYERS_PATH}?notice=${encodeURIComponent('Account login deleted. Historical player records were preserved.')}`);
}

export async function assignAccess(formData: FormData) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const profileId = readFormValue(formData, 'profileId');
  const access = readFormValue(formData, 'access');
  if (!profileId) redirect(`${PLAYERS_PATH}?error=Profile is required.`);

  const result = access === 'commissioner'
    ? await service.assignCommissioner(profileId, commissionerProfileId)
    : await service.assignCaptainTeam(
      profileId,
      access.startsWith('captain:') ? access.slice('captain:'.length) : null,
      commissionerProfileId,
    );
  if (!result.ok) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(result.message)}`);

  revalidatePeoplePages();
  redirect(`${PLAYERS_PATH}?notice=${encodeURIComponent(
    access === 'commissioner' ? 'Commissioner access granted.' : 'Member access updated.',
  )}`);
}

export async function assignCaptain(formData: FormData) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const profileId = readFormValue(formData, 'profileId');
  const teamId = readFormValue(formData, 'teamId') || null;
  if (!profileId) redirect(`${PLAYERS_PATH}?error=Profile is required.`);

  const result = await service.assignCaptainTeam(profileId, teamId, commissionerProfileId);
  if (!result.ok) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(result.message)}`);

  revalidatePeoplePages();
  redirect(`${PLAYERS_PATH}?notice=${encodeURIComponent(teamId ? 'Captain access updated.' : 'Captain access removed.')}`);
}

export async function linkProfileToPlayer(formData: FormData) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const profileId = readFormValue(formData, 'profileId');
  const playerId = readFormValue(formData, 'playerId');
  const useProfileName = readFormValue(formData, 'useProfileName') === 'true';
  if (!profileId) redirect(`${PLAYERS_PATH}?error=Profile is required.`);
  if (!playerId) redirect(`${PLAYERS_PATH}?error=Player is required.`);

  const result = await service.linkProfileToPlayer(profileId, playerId, commissionerProfileId, useProfileName);
  if (!result.ok) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(result.message)}`);

  revalidatePeoplePages();
  redirect(`${PLAYERS_PATH}?notice=Account linked to player record.`);
}

export async function createNewPlayerForProfile(formData: FormData) {
  const {commissionerProfileId, repository, service} = await getCommissionerService();
  const profileId = readFormValue(formData, 'profileId');
  if (!profileId) redirect(`${PLAYERS_PATH}?error=Profile is required.`);

  const profile = await repository.getProfile(profileId);
  if (!profile) redirect(`${PLAYERS_PATH}?error=Profile not found.`);
  if (profile.playerId) redirect(`${PLAYERS_PATH}?error=This account is already linked to a player.`);

  const createResult = await service.savePlayer({
    name: profile.displayName,
    gender: 'Unknown',
    pdgaNumber: '',
    pdgaRating: null,
    currentTeamId: null,
    active: true,
  }, commissionerProfileId);
  if (!createResult.ok) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(createResult.message)}`);

  const linkResult = await service.linkProfileToPlayer(
    profileId,
    createResult.data.id,
    commissionerProfileId,
    true,
  );
  if (!linkResult.ok) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(linkResult.message)}`);

  revalidatePeoplePages();
  revalidatePath('/account');
  redirect(`${PLAYERS_PATH}?notice=${encodeURIComponent('New player record created and account approved.')}`);
}

async function setProfileStatus(formData: FormData, status: 'Approved' | 'Rejected' | 'Suspended', notice: string) {
  const {commissionerProfileId, service} = await getCommissionerService();
  const profileId = readFormValue(formData, 'profileId');
  if (!profileId) redirect(`${PLAYERS_PATH}?error=Profile is required.`);

  const result = await service.setProfileStatus(profileId, status, commissionerProfileId);
  if (!result.ok) redirect(`${PLAYERS_PATH}?error=${encodeURIComponent(result.message)}`);

  revalidatePeoplePages();
  redirect(`${PLAYERS_PATH}?notice=${encodeURIComponent(notice)}`);
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
    repository,
    service: new LaunchService(repository),
  };
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readGender(value: string): LaunchPlayer['gender'] {
  return value === 'Male' || value === 'Female' || value === 'Unknown' ? value : 'Unknown';
}

function readRating(value: string): number | null {
  if (!value) return null;
  const rating = Number(value);
  return Number.isFinite(rating) ? Math.round(rating) : null;
}

function revalidatePeoplePages() {
  revalidatePath(PLAYERS_PATH);
  revalidatePath('/office/members');
}
