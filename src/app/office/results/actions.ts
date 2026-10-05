'use server';

import {revalidatePath, revalidateTag} from 'next/cache';
import {createServerPlayoffService} from '@/core/createServerPlayoffService';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import type {Course} from '@/domain/course/Course';
import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
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
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';
import type {Team} from '@/models/Team';
import {easternDate} from '@/services/weather/MatchWeather';
import {getDailyMatchWeather} from '@/services/weather/MatchWeatherServer';
import {saveFinalMatchdayWeather, type FinalMatchWeather} from '@/services/matches/FinalMatchdaySnapshot';
import {
  calculateMatchPointsAvailability,
  type MatchPlayerGender,
  type MatchPointsAvailability,
} from '@/services/results/MatchPointsAvailability';

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

export type ResultRosterPlayer = {
  id: string;
  name: string;
  teamId: string;
};

export type ResultStructuralCategory = 'NoShow' | 'WomenBonus' | 'Penalty' | 'Other';

export type ResultStructuralPointInput = {
  awardedTeamId: string;
  category: ResultStructuralCategory;
  points: number;
  note?: string;
};

export type ResultProcessingStatus = {
  ciProcessed: boolean;
  factCount: number;
  playerUpdateCount: number;
  processedAt: string | null;
};

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

export async function loadResultRosterPlayers(
  matchId: string,
): Promise<ResultsReadResult<ResultRosterPlayer[]>> {
  const normalizedMatchId = matchId.trim();
  if (!normalizedMatchId || normalizedMatchId.length > 200) {
    return {ok: false, message: 'A valid match is required.'};
  }

  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  try {
    const {data, error} = await (access.supabase as any)
      .from('launch_match_roster_snapshot_players')
      .select('team_id,player_id,player_name_snapshot')
      .eq('match_id', normalizedMatchId)
      .order('player_name_snapshot');
    if (error) throw error;

    return {
      ok: true,
      data: (data ?? []).map((row: {
        team_id: string;
        player_id: string;
        player_name_snapshot: string;
      }) => ({
        id: row.player_id,
        name: row.player_name_snapshot,
        teamId: row.team_id,
      })),
    };
  } catch {
    return {ok: false, message: 'Official match roster could not be loaded.'};
  }
}


export async function loadResultStructuralPoints(
  matchId: string,
): Promise<ResultsReadResult<ResultStructuralPointInput[]>> {
  const normalizedMatchId = matchId.trim();
  if (!normalizedMatchId || normalizedMatchId.length > 200) {
    return {ok: false, message: 'A valid match is required.'};
  }

  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  try {
    const {data, error} = await (access.supabase as any)
      .from('launch_match_structural_points')
      .select('awarded_team_id,category,points,note')
      .eq('match_id', normalizedMatchId)
      .order('awarded_team_id')
      .order('category');
    if (error) throw error;

    return {
      ok: true,
      data: (data ?? []).map((row: {
        awarded_team_id: string;
        category: ResultStructuralCategory;
        points: number | string;
        note: string | null;
      }) => ({
        awardedTeamId: row.awarded_team_id,
        category: row.category,
        points: Number(row.points),
        note: row.note ?? undefined,
      })),
    };
  } catch {
    return {ok: false, message: 'Additional scoring adjustments could not be loaded.'};
  }
}

export async function loadResultProcessingStatus(
  matchId: string,
): Promise<ResultsReadResult<ResultProcessingStatus>> {
  const normalizedMatchId = matchId.trim();
  if (!normalizedMatchId || normalizedMatchId.length > 200) {
    return {ok: false, message: 'A valid match is required.'};
  }

  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  try {
    const {data, error} = await (createAdminClient() as any)
      .from('clash_match_publications')
      .select('fact_count,player_update_count,published_at')
      .eq('match_id', normalizedMatchId)
      .maybeSingle();
    if (error) throw error;

    return {
      ok: true,
      data: {
        ciProcessed: Boolean(data),
        factCount: Number(data?.fact_count ?? 0),
        playerUpdateCount: Number(data?.player_update_count ?? 0),
        processedAt: data?.published_at ?? null,
      },
    };
  } catch {
    return {ok: false, message: 'Post-match processing status could not be loaded.'};
  }
}

export async function saveOfficeResult(
  action: 'draft' | 'publish' | 'reopen',
  matchId: string,
  seasonId: string,
  input: MatchResultInput,
  structuralPoints: ResultStructuralPointInput[] = [],
): Promise<ResultsServiceResult<MatchResult>> {
  const normalizedMatchId = matchId.trim();
  if (!normalizedMatchId || normalizedMatchId.length > 200) {
    return {ok: false, message: 'A valid match is required.'};
  }

  const access = await getCommissionerAccess();
  if (!access.ok) return access;

  const resultsService = await createServerResultsService();

  try {
    let result: ResultsServiceResult<MatchResult>;

    if (action === 'reopen') {
      result = await resultsService.reopen(normalizedMatchId);
    } else {
      // Persist the editable payload first. Finalization operates only on the
      // persisted Draft so a CI failure can never leave a public partial result.
      result = await resultsService.saveDraft(normalizedMatchId, input);
      if (!result.ok) return result;

      const availability = await calculatePersistedMatchAvailability(
        access.supabase,
        resultsService,
        normalizedMatchId,
      );
      if (!availability.ok) return availability;

      const availabilitySave = await persistMatchPointsAvailability(
        access.supabase,
        normalizedMatchId,
        availability.data,
      );
      if (!availabilitySave.ok) return availabilitySave;

      const reviewedStructuralPoints = structuralPoints
        .filter((point) => point.category !== 'WomenBonus');
      if (availability.data.homeGenderBonusAvailable > 0) {
        reviewedStructuralPoints.push({
          awardedTeamId: availability.homeTeamId,
          category: 'WomenBonus',
          points: availability.data.homeGenderBonusAvailable,
          note: 'Automatically calculated from the finalized matchup genders.',
        });
      }
      if (availability.data.awayGenderBonusAvailable > 0) {
        reviewedStructuralPoints.push({
          awardedTeamId: availability.awayTeamId,
          category: 'WomenBonus',
          points: availability.data.awayGenderBonusAvailable,
          note: 'Automatically calculated from the finalized matchup genders.',
        });
      }

      const structuralSave = await replaceResultStructuralPoints(
        access.supabase,
        normalizedMatchId,
        reviewedStructuralPoints,
      );
      if (!structuralSave.ok) return structuralSave;

      if (action === 'draft') {
        const refreshedDraft = await resultsService.getResult(normalizedMatchId);
        if (refreshedDraft) result = {ok: true, data: refreshedDraft};
      }

      if (action === 'publish') {
        const {error} = await (access.supabase as any).rpc(
          'finalize_clash_match_result',
          {p_match_id: normalizedMatchId},
        );
        if (error) {
          return {
            ok: false,
            message: cleanFinalizationError(error.message),
          };
        }

        const published = await resultsService.getResult(normalizedMatchId);
        if (!published || published.status !== 'Published') {
          return {ok: false, message: 'Finalization completed without a published result. Review the Matchday before retrying.'};
        }
        result = {ok: true, data: published};
      }
    }

    if (!result.ok) return result;

    if (action === 'publish') {
      await captureFinalMatchdayWeather(access.supabase, normalizedMatchId);
    }

    if (action !== 'draft' && seasonId.trim()) {
      await (await createServerPlayoffService()).getBracket(seasonId.trim());
    }
    revalidateResultSurfaces(normalizedMatchId);
    return result;
  } catch (error) {
    return {
      ok: false,
      message: cleanFinalizationError(error instanceof Error ? error.message : 'Result processing failed.'),
    };
  }
}

async function calculatePersistedMatchAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resultsService: Awaited<ReturnType<typeof createServerResultsService>>,
  matchId: string,
): Promise<
  | {ok: true; homeTeamId: string; awayTeamId: string; data: MatchPointsAvailability}
  | {ok: false; message: string}
> {
  try {
    const scheduleService = await createServerScheduleService();
    const [match, contests] = await Promise.all([
      scheduleService.getMatch(matchId),
      resultsService.getContests(matchId),
    ]);
    if (!match?.homeTeamId || !match.awayTeamId) {
      return {ok: false, message: 'Both scheduled teams are required to calculate points available.'};
    }

    const playerIds = [...new Set(
      contests.flatMap((contest) => contest.players.map((player) => player.playerId))
        .filter(Boolean),
    )];
    const genderByPlayerId = new Map<string, MatchPlayerGender>();
    if (playerIds.length) {
      const {data, error} = await (supabase as any)
        .from('launch_players')
        .select('id,gender')
        .in('id', playerIds);
      if (error) throw error;
      for (const player of data ?? []) {
        genderByPlayerId.set(
          player.id,
          player.gender === 'Female' || player.gender === 'Male' ? player.gender : 'Unknown',
        );
      }
    }

    return {
      ok: true,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      data: calculateMatchPointsAvailability(contests, genderByPlayerId),
    };
  } catch {
    return {ok: false, message: 'Points available could not be calculated from the loaded scoreboard.'};
  }
}

async function persistMatchPointsAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  availability: MatchPointsAvailability,
): Promise<{ok: true} | {ok: false; message: string}> {
  const {error} = await (supabase as any)
    .from('launch_match_results')
    .update({
      home_base_points_available: availability.homeBasePointsAvailable,
      away_base_points_available: availability.awayBasePointsAvailable,
      home_gender_bonus_available: availability.homeGenderBonusAvailable,
      away_gender_bonus_available: availability.awayGenderBonusAvailable,
      home_points_available: availability.homePointsAvailable,
      away_points_available: availability.awayPointsAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq('match_id', matchId);
  if (error) {
    return {ok: false, message: 'Points available could not be saved with the match result.'};
  }
  return {ok: true};
}

async function replaceResultStructuralPoints(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  points: ResultStructuralPointInput[],
): Promise<{ok: true} | {ok: false; message: string}> {
  const normalized = points.filter((point) =>
    point.awardedTeamId.trim()
    && Number.isFinite(point.points)
    && point.points > 0
    && Number.isInteger(point.points * 2)
    && ['NoShow', 'WomenBonus', 'Penalty', 'Other'].includes(point.category),
  );

  if (normalized.length !== points.length) {
    return {ok: false, message: 'Review the additional scoring adjustments before finalizing.'};
  }

  const {error: deleteError} = await (supabase as any)
    .from('launch_match_structural_points')
    .delete()
    .eq('match_id', matchId);
  if (deleteError) {
    return {ok: false, message: 'Existing scoring adjustments could not be replaced.'};
  }

  if (!normalized.length) return {ok: true};

  const {error: insertError} = await (supabase as any)
    .from('launch_match_structural_points')
    .insert(normalized.map((point) => ({
      match_id: matchId,
      awarded_team_id: point.awardedTeamId,
      category: point.category,
      points: point.points,
      note: point.note?.trim() || null,
      updated_at: new Date().toISOString(),
    })));
  if (insertError) {
    return {ok: false, message: 'Additional scoring adjustments could not be saved.'};
  }

  return {ok: true};
}

function cleanFinalizationError(message: string): string {
  const normalized = message.replace(/^.*?error:\s*/i, '').trim();
  if (normalized.includes('This Matchday has already updated Clash Index')) {
    return 'This Matchday has already updated Clash Index. Use the CI correction workflow instead of reopening it.';
  }
  return normalized || 'Match finalization failed.';
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
  revalidateTag('public:stats', 'max');
  revalidateTag('public:players', 'max');
  revalidateTag('public:teams', 'max');
  revalidatePath('/');
  revalidatePath('/standings');
  revalidatePath('/stats');
  revalidatePath('/players');
  revalidatePath('/teams');
  revalidatePath('/playoffs');
  revalidatePath(`/matches/${encodeURIComponent(matchId)}`);
}


async function captureFinalMatchdayWeather(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
) {
  try {
    const scheduleService = await createServerScheduleService();
    const match = await scheduleService.getMatch(matchId);
    if (!match?.courseId || !match.date) return;

    const course = await new SupabaseCourseRepository(supabase).getById(match.courseId);
    if (!course?.city || !course.state) return;

    const forecast = await getDailyMatchWeather(course.city, course.state, match.date, easternDate());
    if (!forecast) return;

    const condition: FinalMatchWeather['condition'] = forecast.condition?.icon === 'storm'
      ? 'storm'
      : forecast.condition?.icon === 'rain'
        ? 'rain'
        : forecast.condition?.icon === 'sun'
          ? 'sun'
          : 'cloudy';

    await saveFinalMatchdayWeather(supabase, matchId, {
      temperature: forecast.high,
      condition,
      wind: forecast.wind,
      windDirection: forecast.windDirection,
    });
  } catch (error) {
    // Results are canonical even if supplemental weather capture is unavailable.
    console.error('Final Matchday weather snapshot failed.', {
      matchId,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
  }
}
