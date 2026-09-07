'use server';

import {revalidatePath, revalidateTag} from 'next/cache';
import type {Course} from '@/domain/course/Course';
import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {
  MatchLogisticsService,
  type MatchLogisticsInput,
} from '@/domain/schedule/MatchLogisticsService';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Schedule, ScheduleServiceResult} from '@/domain/schedule/Schedule';
import {SupabaseScheduleRepository} from '@/domain/schedule/SupabaseScheduleRepository';
import type {Season} from '@/domain/season/Season';
import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {createClient} from '@/lib/supabase/server';
import type {Team} from '@/models/Team';
import {getMatchPublicIdentities, publicMatchHref} from '@/services/matches/MatchPublicIdentity';

type ScheduleSpreadsheetBaseData = {
  schedules: Schedule[];
  seasons: Season[];
  teams: Team[];
  courses: Course[];
};

type ScheduleSpreadsheetRows = {
  rounds: Round[];
  matches: Match[];
};

type ScheduleReadResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string};

export async function loadScheduleSpreadsheetBaseData(): Promise<ScheduleReadResult<ScheduleSpreadsheetBaseData>> {
  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  try {
    const scheduleService = await createServerScheduleService();
    const seasonService = new SeasonService(new SupabaseSeasonRepository(access.supabase));
    const [schedules, seasons, teams, courses] = await Promise.all([
      scheduleService.getSchedules({search: '', seasonId: 'all', publication: 'all'}),
      seasonService.getAll(),
      scheduleService.getTeams(),
      scheduleService.getCourses(),
    ]);
    return {ok: true, data: {schedules, seasons, teams, courses}};
  } catch {
    return {ok: false, message: 'Schedule data could not be loaded.'};
  }
}

export async function loadScheduleSpreadsheetRows(
  scheduleId: string,
): Promise<ScheduleReadResult<ScheduleSpreadsheetRows>> {
  const normalizedScheduleId = scheduleId.trim();
  if (!normalizedScheduleId || normalizedScheduleId.length > 200) {
    return {ok: false, message: 'A valid schedule is required.'};
  }

  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  try {
    const scheduleService = await createServerScheduleService();
    const rounds = await scheduleService.getRounds(normalizedScheduleId);
    const matchGroups = await Promise.all(
      rounds.map((round) => scheduleService.getMatches(round.id)),
    );
    return {ok: true, data: {rounds, matches: matchGroups.flat()}};
  } catch {
    return {ok: false, message: 'Matches could not be loaded.'};
  }
}

export async function saveMatchLogistics(
  matchId: string,
  input: MatchLogisticsInput,
): Promise<ScheduleServiceResult<Match>> {
  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  const {supabase} = access;
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

  return {ok: true as const, supabase};
}
