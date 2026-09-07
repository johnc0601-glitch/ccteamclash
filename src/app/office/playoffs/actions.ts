'use server';

import {revalidatePath, revalidateTag} from 'next/cache';
import {createServerPlayoffService} from '@/core/createServerPlayoffService';
import type {
  GeneratePlayoffInput,
  PlayoffBracketView,
  PlayoffResult,
} from '@/domain/playoffs/Playoff';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export async function generateOfficePlayoffs(
  input: GeneratePlayoffInput,
): Promise<PlayoffResult<PlayoffBracketView>> {
  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  const result = await (await createServerPlayoffService()).generate(input);
  if (!result.ok) return result;

  revalidatePlayoffSurfaces([
    input.semifinal1MatchId,
    input.semifinal2MatchId,
    input.championshipMatchId,
  ]);
  return result;
}

export async function publishOfficePlayoffs(
  seasonId: string,
): Promise<PlayoffResult<PlayoffBracketView>> {
  const normalizedSeasonId = seasonId.trim();
  if (!normalizedSeasonId || normalizedSeasonId.length > 200) {
    return {ok: false, message: 'A valid season is required.'};
  }

  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  const result = await (await createServerPlayoffService()).publish(normalizedSeasonId);
  if (!result.ok) return result;

  revalidatePlayoffSurfaces();
  return result;
}

async function getCommissionerAccess() {
  const supabase = await createClient();
  const {data: {user}, error} = await supabase.auth.getUser();
  if (error || !user) {
    return {ok: false as const, message: 'Commissioner sign-in required.'};
  }

  const profile = await new SupabaseLaunchRepository(supabase).getProfileByUserId(user.id);
  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    return {ok: false as const, message: 'Approved commissioner access is required.'};
  }

  return {ok: true as const};
}

function revalidatePlayoffSurfaces(matchIds: string[] = []) {
  revalidateTag('public:homepage', 'max');
  revalidateTag('public:schedule', 'max');
  revalidatePath('/');
  revalidatePath('/playoffs');
  revalidatePath('/schedule');
  revalidatePath('/standings');
  revalidatePath('/teams');
  for (const matchId of matchIds) {
    revalidatePath(`/matches/${encodeURIComponent(matchId)}`);
  }
}
