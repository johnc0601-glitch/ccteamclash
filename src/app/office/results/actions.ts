'use server';

import {revalidatePath, revalidateTag} from 'next/cache';
import {createServerPlayoffService} from '@/core/createServerPlayoffService';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import type {Course} from '@/domain/course/Course';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {
  MatchResult,
  MatchResultInput,
  ResultContest,
  ResultsServiceResult,
} from '@/domain/results/MatchResult';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Schedule} from '@/domain/schedule/Schedule';
import {createClient} from '@/lib/supabase/server';
import type {Team} from '@/models/Team';

type ResultsWorkspace = {
  schedules: Schedule[];
  rounds: Round[];
  matches: Match[];
  results: MatchResult[];
  teams: Team[];
  courses: Course[];
  roundId: string;
  players: LaunchPlayer[];
};

type ResultsReadResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string};

export async function loadResultsWorkspace(
  preferredRoundId = '',
): Promise<ResultsReadResult<ResultsWorkspace>> {
  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  try {
    const scheduleService = await createServerScheduleService();
    const resultsService = await createServerResultsService();
    const launchRepository = new SupabaseLaunchRepository(access.supabase);
    const [schedules, teams, courses, results, players] = await Promise.all([
      scheduleService.getSchedules(),
      scheduleService.getTeams(),
      scheduleService.getCourses(),
      resultsService.getResults(),
      launchRepository.getPlayers(),
    ]);
    const rounds = (await Promise.all(
      schedules.map((schedule) => scheduleService.getRounds(schedule.id)),
    )).flat().sort((left, right) =>
      (left.date ?? '').localeCompare(right.date ?? '') || left.number - right.number,
    );
    const roundId = preferredRoundId && rounds.some((round) => round.id === preferredRoundId)
      ? preferredRoundId
      : rounds[0]?.id ?? '';
    const matches = roundId ? await scheduleService.getMatches(roundId) : [];
    return {
      ok: true,
      data: {schedules, rounds, matches, results, teams, courses, roundId, players},
    };
  } catch {
    return {ok: false, message: 'Results data could not be loaded.'};
  }
}

export async function loadResultsRound(
  roundId: string,
): Promise<ResultsReadResult<Match[]>> {
  const normalizedRoundId = roundId.trim();
  if (!normalizedRoundId || normalizedRoundId.length > 200) {
    return {ok: false, message: 'A valid round is required.'};
  }

  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  try {
    const scheduleService = await createServerScheduleService();
    return {ok: true, data: await scheduleService.getMatches(normalizedRoundId)};
  } catch {
    return {ok: false, message: 'Matches could not be loaded.'};
  }
}

export async function loadResultContests(
  matchId: string,
): Promise<ResultsReadResult<ResultContest[]>> {
  const normalizedMatchId = matchId.trim();
  if (!normalizedMatchId || normalizedMatchId.length > 200) {
    return {ok: false, message: 'A valid match is required.'};
  }

  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  try {
    const resultsService = await createServerResultsService();
    return {ok: true, data: await resultsService.getContests(normalizedMatchId)};
  } catch {
    return {ok: false, message: 'Player contests could not be loaded.'};
  }
}

export async function saveOfficeResult(
  action: 'draft' | 'publish' | 'reopen',
  matchId: string,
  seasonId: string,
  input: MatchResultInput,
): Promise<ResultsServiceResult<MatchResult>> {
  const normalizedMatchId = matchId.trim();
  if (!normalizedMatchId || normalizedMatchId.length > 200) {
    return {ok: false, message: 'A valid match is required.'};
  }

  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  const resultsService = await createServerResultsService();
  const result = action === 'draft'
    ? await resultsService.saveDraft(normalizedMatchId, input)
    : action === 'publish'
      ? await resultsService.publish(normalizedMatchId, input)
      : await resultsService.reopen(normalizedMatchId);
  if (!result.ok) return result;

  if (action !== 'draft' && seasonId.trim()) {
    await (await createServerPlayoffService()).getBracket(seasonId.trim());
  }
  revalidateResultSurfaces(normalizedMatchId);
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

function revalidateResultSurfaces(matchId: string) {
  revalidateTag('public:homepage', 'max');
  revalidateTag('public:schedule', 'max');
  revalidatePath('/');
  revalidatePath('/standings');
  revalidatePath('/stats');
  revalidatePath('/players');
  revalidatePath('/teams');
  revalidatePath('/playoffs');
  revalidatePath(`/matches/${encodeURIComponent(matchId)}`);
}
