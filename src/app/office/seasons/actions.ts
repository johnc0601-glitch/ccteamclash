'use server';

import {revalidatePath, revalidateTag} from 'next/cache';
import type {
  Season,
  SeasonInput,
  SeasonServiceResult,
  SeasonStatusFilter,
} from '@/domain/season/Season';
import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

type LoadSeasonsResult =
  | {ok: true; data: Season[]}
  | {ok: false; message: string};

type CommissionerSeasonContext =
  | {ok: true; service: SeasonService}
  | {ok: false; message: string};

export async function loadSeasons(
  search: string,
  status: SeasonStatusFilter,
): Promise<LoadSeasonsResult> {
  const context = await getCommissionerSeasonContext();
  if (!context.ok) return context;

  try {
    return {ok: true, data: await context.service.getAll({search, status})};
  } catch {
    return {ok: false, message: 'Seasons could not be loaded.'};
  }
}

export async function createSeason(input: SeasonInput): Promise<SeasonServiceResult<Season>> {
  return runSeasonMutation((service) => service.create(input));
}

export async function updateSeason(
  id: string,
  input: SeasonInput,
): Promise<SeasonServiceResult<Season>> {
  return runSeasonMutation((service) => service.update(id, input));
}

export async function activateSeason(id: string): Promise<SeasonServiceResult<Season>> {
  return runSeasonMutation((service) => service.activate(id));
}

export async function duplicateSeason(id: string): Promise<SeasonServiceResult<Season>> {
  return runSeasonMutation((service) => service.duplicate(id));
}

export async function archiveSeason(id: string): Promise<SeasonServiceResult<Season>> {
  return runSeasonMutation((service) => service.archive(id));
}

export async function deleteSeason(id: string): Promise<SeasonServiceResult<string>> {
  return runSeasonMutation((service) => service.delete(id));
}

async function runSeasonMutation<T>(
  action: (service: SeasonService) => Promise<SeasonServiceResult<T>>,
): Promise<SeasonServiceResult<T>> {
  const context = await getCommissionerSeasonContext();
  if (!context.ok) return context;

  try {
    const result = await action(context.service);
    if (result.ok) revalidateSeasonSurfaces();
    return result;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Season could not be saved.',
    };
  }
}

async function getCommissionerSeasonContext(): Promise<CommissionerSeasonContext> {
  const supabase = await createClient();
  const {data: {user}, error} = await supabase.auth.getUser();
  if (error || !user) return {ok: false, message: 'Commissioner sign-in required.'};

  const profile = await new SupabaseLaunchRepository(supabase).getProfileByUserId(user.id);
  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    return {ok: false, message: 'Approved commissioner access is required.'};
  }

  return {
    ok: true,
    service: new SeasonService(new SupabaseSeasonRepository(supabase)),
  };
}

function revalidateSeasonSurfaces() {
  revalidateTag('public:schedule', 'max');
  revalidateTag('public:homepage', 'max');
  revalidatePath('/');
  revalidatePath('/office/seasons');
  revalidatePath('/schedule');
  revalidatePath('/standings');
  revalidatePath('/stats');
  revalidatePath('/teams');
  revalidatePath('/players');
}
