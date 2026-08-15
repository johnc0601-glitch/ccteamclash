'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createServerSeasonRosterService} from '@/core/createServerSeasonRosterService';
import {seasonRosterActionError} from '@/domain/season-roster/SeasonRosterActionMessage';
import type {SeasonRosterCategory} from '@/domain/season-roster/SeasonRosterMembership';
import {createClient} from '@/lib/supabase/server';

type ReturnPath = '/captain' | '/office/rosters';

export async function addSeasonRosterMember(returnPath: ReturnPath, formData: FormData) {
  const path = safeReturnPath(returnPath);
  const seasonId = readValue(formData, 'seasonId');
  const authenticated = await hasAuthenticatedUser();
  if (!authenticated) redirect(`/account?error=${encodeURIComponent('Please sign in to continue.')}`);

  const service = await createServerSeasonRosterService();
  let errorMessage: string | undefined;
  try {
    const result = await service.addMembership({
      seasonId,
      teamId: readValue(formData, 'teamId'),
      playerId: readValue(formData, 'playerId'),
      rosterCategory: readValue(formData, 'rosterCategory') as SeasonRosterCategory,
    });
    if (!result.ok) errorMessage = result.message;
  } catch (error) {
    errorMessage = seasonRosterActionError(error);
  }
  if (errorMessage) redirect(withMessage(path, 'rosterError', errorMessage, seasonId));

  revalidatePath('/captain');
  revalidatePath('/office/rosters');
  redirect(withMessage(path, 'rosterNotice', 'Player added to the season roster.', seasonId));
}

export async function dropSeasonRosterMember(returnPath: ReturnPath, formData: FormData) {
  const path = safeReturnPath(returnPath);
  const seasonId = readValue(formData, 'seasonId');
  const authenticated = await hasAuthenticatedUser();
  if (!authenticated) redirect(`/account?error=${encodeURIComponent('Please sign in to continue.')}`);

  const service = await createServerSeasonRosterService();
  let errorMessage: string | undefined;
  try {
    const result = await service.dropMembership({
      seasonId,
      playerId: readValue(formData, 'playerId'),
    });
    if (!result.ok) errorMessage = result.message;
  } catch (error) {
    errorMessage = seasonRosterActionError(error);
  }
  if (errorMessage) redirect(withMessage(path, 'rosterError', errorMessage, seasonId));

  revalidatePath('/captain');
  revalidatePath('/office/rosters');
  redirect(withMessage(path, 'rosterNotice', 'Player dropped from the season roster.', seasonId));
}

async function hasAuthenticatedUser(): Promise<boolean> {
  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  return !error && Boolean(data.user);
}

function readValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function safeReturnPath(value: string): ReturnPath {
  return value === '/captain' ? '/captain' : '/office/rosters';
}

function withMessage(
  path: ReturnPath,
  key: 'rosterNotice' | 'rosterError',
  message: string,
  seasonId: string,
): string {
  const params = new URLSearchParams({[key]: message});
  if (path === '/office/rosters' && seasonId) params.set('seasonId', seasonId);
  return `${path}?${params.toString()}`;
}
