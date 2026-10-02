'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import type {AttendanceActor, AttendanceMatch, MatchAttendanceStatus} from '@/domain/match-roster/MatchAttendance';
import {isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {createClient} from '@/lib/supabase/server';
import {getPublicMatchHref} from '@/services/matches/MatchPublicIdentity';

const MANAGER_STATUSES = new Set(['Scheduled', 'Postponed', 'Rain Delay']);
type BatchStatus = MatchAttendanceStatus | 'Unconfirmed';
type BatchChange = {
  playerId: string;
  status: BatchStatus;
  singlesAvailable: boolean;
  doublesAvailable: boolean;
};

export type BorrowableFemaleCandidate = {
  playerId: string;
  playerName: string;
  originalTeamId: string;
  originalTeamName: string;
  clashIndex: number | null;
  availabilityStatus: string;
};

export async function loadBorrowableFemaleCandidates(
  matchId: string,
  teamId: string,
): Promise<{ok: true; players: BorrowableFemaleCandidate[]} | {ok: false; message: string}> {
  const cleanMatchId = cleanId(matchId);
  const cleanTeamId = cleanId(teamId);
  if (!cleanMatchId || !cleanTeamId) return {ok: false, message: 'Available women could not be loaded.'};

  try {
    const {context} = await getManagementNavigation(cleanMatchId);
    if (!context || !context.teamIds.includes(cleanTeamId)) {
      return {ok: false, message: 'You cannot manage borrowed players for this roster.'};
    }

    const {data, error} = await (context.supabase as any).rpc('captain_list_borrowable_females', {
      target_match_id: cleanMatchId,
      target_team_id: cleanTeamId,
    });
    if (error) throw error;

    return {
      ok: true,
      players: (data ?? []).map((row: any) => ({
        playerId: String(row.player_id),
        playerName: typeof row.player_name === 'string' ? row.player_name : '',
        originalTeamId: String(row.original_team_id),
        originalTeamName: typeof row.original_team_name === 'string' ? row.original_team_name : '',
        clashIndex: typeof row.clash_index === 'number' ? row.clash_index : null,
        availabilityStatus: typeof row.availability_status === 'string' ? row.availability_status : 'Unconfirmed',
      })),
    };
  } catch (error) {
    console.error('Borrowable female roster candidates could not be loaded.', {
      matchId: cleanMatchId,
      teamId: cleanTeamId,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    return {ok: false, message: 'Available women could not be loaded. Try again.'};
  }
}

export async function borrowFemaleForMatch(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const teamId = readFormValue(formData, 'teamId');
  const playerId = readFormValue(formData, 'playerId');
  if (!matchId || !teamId || !playerId) redirect('/captain?error=Match, team, and player are required.');

  const {publicMatchPath, path, context} = await getManagementNavigation(matchId);
  if (!context || !context.teamIds.includes(teamId)) {
    redirect(`${path}&captainError=${encodeURIComponent('You cannot manage borrowed players for this roster.')}`);
  }

  try {
    const {error} = await (context.supabase as any).rpc('captain_borrow_female_for_match', {
      target_match_id: matchId,
      target_team_id: teamId,
      target_player_id: playerId,
    });
    if (error) throw error;
  } catch (error) {
    console.error('Borrowed female roster add failed.', {
      matchId,
      teamId,
      playerId,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    redirect(`${path}&captainError=${encodeURIComponent('That player could not be borrowed for this match.')}`);
  }

  revalidatePath(publicMatchPath);
  revalidatePath('/captain');
  redirect(`${path}&captainNotice=${encodeURIComponent('Borrowed player added to this match roster.')}`);
}

export async function removeBorrowedFemaleFromMatch(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const teamId = readFormValue(formData, 'teamId');
  const playerId = readFormValue(formData, 'playerId');
  if (!matchId || !teamId || !playerId) redirect('/captain?error=Match, team, and player are required.');

  const {publicMatchPath, path, context} = await getManagementNavigation(matchId);
  if (!context || !context.teamIds.includes(teamId)) {
    redirect(`${path}&captainError=${encodeURIComponent('You cannot manage borrowed players for this roster.')}`);
  }

  try {
    const {error} = await (context.supabase as any).rpc('captain_remove_borrowed_female_from_match', {
      target_match_id: matchId,
      target_team_id: teamId,
      target_player_id: playerId,
    });
    if (error) throw error;
  } catch (error) {
    console.error('Borrowed female roster removal failed.', {
      matchId,
      teamId,
      playerId,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    redirect(`${path}&captainError=${encodeURIComponent('Borrowed player could not be removed.')}`);
  }

  revalidatePath(publicMatchPath);
  revalidatePath('/captain');
  redirect(`${path}&captainNotice=${encodeURIComponent('Borrowed player removed from this match roster.')}`);
}

export async function saveCaptainRosterAvailabilityBatch(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const teamId = readFormValue(formData, 'teamId');
  const rawChanges = readFormValue(formData, 'changes');
  if (!matchId || !teamId || !rawChanges) redirect('/captain?error=Match, team, and availability changes are required.');
  const {publicMatchPath, path, context} = await getManagementNavigation(matchId);
  const changes = parseBatchChanges(rawChanges);
  if (!changes) {
    redirect(`${path}&captainError=${encodeURIComponent('Roster changes are invalid.')}`);
    return;
  }
  if (!changes.length) {
    redirect(`${path}&captainNotice=${encodeURIComponent('No roster changes to save.')}`);
    return;
  }
  if (!context || !context.teamIds.includes(teamId)) {
    redirect(`${path}&captainError=${encodeURIComponent('You cannot manage that team roster.')}`);
    return;
  }

  const teamPlayers = await context.repository.getTeamAttendance(matchId, teamId);
  const allowedPlayerIds = new Set(teamPlayers.map((player) => player.playerId));
  if (changes.some((change) => !allowedPlayerIds.has(change.playerId))) redirect(`${path}&captainError=${encodeURIComponent('One or more players are not on the roster you manage.')}`);

  if (context.overrideTeamIds.has(teamId)) {
    try {
      const {error} = await (context.supabase as any).rpc('captain_save_unlocked_match_roster', {
        target_match_id: matchId,
        target_team_id: teamId,
        p_changes: toRpcChanges(changes),
      });
      if (error) throw error;
    } catch (error) {
      console.error('Unlocked captain roster save failed.', {matchId, teamId, changeCount: changes.length, errorClass: error instanceof Error ? error.name : 'UnknownError'});
      redirect(`${path}&captainError=${encodeURIComponent('Roster changes could not be saved.')}`);
    }
    revalidatePath(publicMatchPath);
    revalidatePath('/captain');
    redirect(`${publicMatchPath}?captainNotice=${encodeURIComponent('Roster updated and locked again.')}`);
  }

  try {
    const {error} = await (context.supabase as any).rpc('captain_save_match_roster_availability_batch', {
      target_match_id: matchId,
      target_team_id: teamId,
      p_changes: toRpcChanges(changes),
    });
    if (error) throw error;
  } catch (error) {
    console.error('Captain batch availability update failed.', {matchId, teamId, changeCount: changes.length, errorClass: error instanceof Error ? error.name : 'UnknownError'});
    redirect(`${path}&captainError=${encodeURIComponent('Roster changes could not be saved.')}`);
  }
  revalidatePath(publicMatchPath);
  redirect(`${path}&captainNotice=${encodeURIComponent(`${changes.length} roster change${changes.length === 1 ? '' : 's'} saved.`)}`);
}

export async function setCaptainRosterAvailability(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const playerId = readFormValue(formData, 'playerId');
  const status = readFormValue(formData, 'status');
  if (!matchId || !playerId || (status !== 'Playing' && status !== 'NotPlaying')) redirect('/captain?error=Match, player, and availability are required.');
  const {publicMatchPath, path, context} = await getManagementNavigation(matchId);
  if (!context) redirect(`${path}&captainError=${encodeURIComponent('Roster management is closed for this match.')}`);
  const team = await findManagedPlayerTeam(context, playerId);
  if (!team) redirect(`${path}&captainError=${encodeURIComponent('That player is not on a team you manage for this match.')}`);
  if (context.overrideTeamIds.has(team)) redirect(`${path}&captainError=${encodeURIComponent('Use Save roster to apply the correction and lock it again.')}`);
  try {
    await context.repository.saveAttendance({matchId, teamId: team, playerId, status: status as MatchAttendanceStatus, updatedBy: context.actor.profileId});
  } catch (error) {
    console.error('Captain availability update failed.', {matchId, playerId, errorClass: error instanceof Error ? error.name : 'UnknownError'});
    redirect(`${path}&captainError=${encodeURIComponent('Player availability could not be saved.')}`);
  }
  revalidatePath(publicMatchPath);
  redirect(`${path}&captainNotice=${encodeURIComponent('Player availability was updated.')}`);
}

export async function clearCaptainRosterAvailability(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const playerId = readFormValue(formData, 'playerId');
  if (!matchId || !playerId) redirect('/captain?error=Match and player are required.');
  const {publicMatchPath, path, context} = await getManagementNavigation(matchId);
  if (!context) redirect(`${path}&captainError=${encodeURIComponent('Roster management is closed for this match.')}`);
  const team = await findManagedPlayerTeam(context, playerId);
  if (!team) redirect(`${path}&captainError=${encodeURIComponent('That player is not on a team you manage for this match.')}`);
  if (context.overrideTeamIds.has(team)) redirect(`${path}&captainError=${encodeURIComponent('Use Save roster to apply the correction and lock it again.')}`);
  try {
    const attendanceClient = context.supabase as any;
    const {error} = await attendanceClient.from('launch_match_attendance').delete().eq('match_id', matchId).eq('team_id', team).eq('player_id', playerId);
    if (error) throw error;
  } catch (error) {
    console.error('Captain availability reset failed.', {matchId, playerId, errorClass: error instanceof Error ? error.name : 'UnknownError'});
    redirect(`${path}&captainError=${encodeURIComponent('Player availability could not be reset.')}`);
  }
  revalidatePath(publicMatchPath);
  redirect(`${path}&captainNotice=${encodeURIComponent('Player availability was reset to unconfirmed.')}`);
}

export async function confirmCaptainManagedRoster(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const teamId = readFormValue(formData, 'teamId');
  if (!matchId || !teamId) redirect('/captain?error=Match and team are required.');
  const {publicMatchPath, path, context} = await getManagementNavigation(matchId);
  if (!context || !context.teamIds.includes(teamId)) redirect(`${path}&captainError=${encodeURIComponent('You cannot confirm that team roster.')}`);
  try {
    if (context.overrideTeamIds.has(teamId)) {
      const {error} = await (context.supabase as any).rpc('captain_confirm_unlocked_match_roster', {target_match_id: matchId, target_team_id: teamId});
      if (error) throw error;
    } else {
      await context.repository.saveMatchRoster({matchId, teamId, confirmedBy: context.actor.profileId, confirmedAt: new Date().toISOString()});
    }
  } catch (error) {
    console.error('Captain roster confirmation failed.', {matchId, teamId, errorClass: error instanceof Error ? error.name : 'UnknownError'});
    redirect(`${path}&captainError=${encodeURIComponent('The roster could not be confirmed.')}`);
  }
  revalidatePath(publicMatchPath);
  revalidatePath('/captain');
  redirect(`${publicMatchPath}?captainNotice=${encodeURIComponent(context.overrideTeamIds.has(teamId) ? 'Match roster confirmed and locked again.' : 'Match roster confirmed.')}`);
}

type ManagementContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  repository: SeasonAwareMatchRosterRepository;
  actor: AttendanceActor;
  match: AttendanceMatch;
  teamIds: string[];
  overrideTeamIds: Set<string>;
};

async function getManagementNavigation(matchId: string): Promise<{
  publicMatchPath: string;
  path: string;
  context: ManagementContext | undefined;
}> {
  const supabase = await createClient();
  const publicMatchPath = await getPublicMatchHref(supabase, matchId);
  const context = await getManagementContext(matchId, supabase);
  return {publicMatchPath, path: `${publicMatchPath}?manage=roster`, context};
}

async function getManagementContext(
  matchId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ManagementContext | undefined> {
  const {data: {user}, error} = await supabase.auth.getUser();
  if (error || !user) redirect(`/account?error=${encodeURIComponent('Sign in with an approved captain account.')}`);
  const repository = new SeasonAwareMatchRosterRepository(supabase);
  const [actor, match] = await Promise.all([repository.getAttendanceActor(user.id), repository.getAttendanceMatch(matchId)]);
  if (!actor || actor.profileStatus !== 'Approved' || !match || !match.date || !MANAGER_STATUSES.has(match.status)) return undefined;

  const matchTeamIds = [match.awayTeamId, match.homeTeamId].filter((teamId): teamId is string => Boolean(teamId));
  if (!isMatchRosterLocked(match)) {
    if (actor.profileRole === 'Commissioner') return {supabase, repository, actor, match, teamIds: matchTeamIds, overrideTeamIds: new Set()};
    if (actor.profileRole === 'Captain' && actor.captainTeamId && matchTeamIds.includes(actor.captainTeamId)) return {supabase, repository, actor, match, teamIds: [actor.captainTeamId], overrideTeamIds: new Set()};
    return undefined;
  }

  if (actor.profileRole !== 'Captain' || !actor.captainTeamId || !matchTeamIds.includes(actor.captainTeamId)) return undefined;
  const {data: unlock} = await (supabase as any).from('launch_match_roster_unlocks').select('team_id').eq('match_id', matchId).eq('team_id', actor.captainTeamId).is('relocked_at', null).maybeSingle();
  if (!unlock) return undefined;
  return {supabase, repository, actor, match, teamIds: [actor.captainTeamId], overrideTeamIds: new Set([actor.captainTeamId])};
}

async function findManagedPlayerTeam(context: ManagementContext, playerId: string): Promise<string | undefined> {
  const rosters = await Promise.all(context.teamIds.map(async (teamId) => ({teamId, players: await context.repository.getTeamAttendance(context.match.id, teamId)})));
  return rosters.find((roster) => roster.players.some((player) => player.playerId === playerId))?.teamId;
}

function parseBatchChanges(raw: string): BatchChange[] | undefined {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 100) return undefined;
    const seen = new Set<string>();
    const changes: BatchChange[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') return undefined;
      const playerId = typeof item.playerId === 'string' ? item.playerId.trim() : '';
      const status = item.status;
      const singlesAvailable = item.singlesAvailable;
      const doublesAvailable = item.doublesAvailable;
      if (
        !playerId
        || seen.has(playerId)
        || (status !== 'Playing' && status !== 'NotPlaying' && status !== 'Unconfirmed')
        || typeof singlesAvailable !== 'boolean'
        || typeof doublesAvailable !== 'boolean'
        || (status === 'Playing' && !singlesAvailable && !doublesAvailable)
        || (status !== 'Playing' && (!singlesAvailable || !doublesAvailable))
      ) return undefined;
      seen.add(playerId);
      changes.push({playerId, status, singlesAvailable, doublesAvailable});
    }
    return changes;
  } catch {
    return undefined;
  }
}

function toRpcChanges(changes: BatchChange[]) {
  return changes.map((change) => ({
    player_id: change.playerId,
    status: change.status,
    singles_available: change.singlesAvailable,
    doubles_available: change.doublesAvailable,
  }));
}

function cleanId(value: string): string {
  return typeof value === 'string' ? value.trim().slice(0, 160) : '';
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
