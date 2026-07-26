'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {LaunchService} from '@/domain/launch/LaunchService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

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

  if (!result.ok) redirect(`/office/players?error=${encodeURIComponent(result.message)}`);

  revalidatePath('/office/players');
  redirect(`/office/players?notice=${encodeURIComponent(playerId ? 'Player updated.' : 'Player created.')}`);
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

function readGender(value: string): LaunchPlayer['gender'] {
  return value === 'Male' || value === 'Female' || value === 'Unknown' ? value : 'Unknown';
}

function readRating(value: string): number | null {
  if (!value) return null;
  const rating = Number(value);
  return Number.isFinite(rating) ? Math.round(rating) : null;
}
