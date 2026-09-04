'use server';

import {revalidatePath, revalidateTag} from 'next/cache';
import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {
  MatchLogisticsService,
  type MatchLogisticsInput,
} from '@/domain/schedule/MatchLogisticsService';
import type {Match} from '@/domain/schedule/Match';
import type {ScheduleServiceResult} from '@/domain/schedule/Schedule';
import {SupabaseScheduleRepository} from '@/domain/schedule/SupabaseScheduleRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {createClient} from '@/lib/supabase/server';
import {getMatchPublicIdentities, publicMatchHref} from '@/services/matches/MatchPublicIdentity';

export async function saveMatchLogistics(
  matchId: string,
  input: MatchLogisticsInput,
): Promise<ScheduleServiceResult<Match>> {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return {ok: false, message: 'Commissioner sign-in required.'};

  const launchRepository = new SupabaseLaunchRepository(supabase);
  const profile = await launchRepository.getProfileByUserId(user.id);
  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    return {ok: false, message: 'Approved commissioner access is required.'};
  }

  const service = new MatchLogisticsService(
    new SupabaseScheduleRepository(supabase),
    new SeasonService(new SupabaseSeasonRepository(supabase)),
    new SupabaseCourseRepository(supabase),
  );

  const result = await service.update(matchId, input);
  if (!result.ok) return result;

  const match = result.data;
  const identities = await getMatchPublicIdentities(supabase as any, [match.id]);
  const identity = identities.get(match.id) ?? {matchId: match.id, publicSlug: null};

  revalidateTag('public:schedule', 'max');
  revalidateTag('public:homepage', 'max');
  revalidatePath('/');
  revalidatePath('/schedule');
  revalidatePath(`/matches/${encodeURIComponent(match.id)}`);
  revalidatePath(publicMatchHref(identity));
  if (match.homeTeamId) revalidatePath(`/teams/${encodeURIComponent(match.homeTeamId)}`);
  if (match.awayTeamId) revalidatePath(`/teams/${encodeURIComponent(match.awayTeamId)}`);

  return result;
}
