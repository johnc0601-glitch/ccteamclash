'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import type {AttendanceActor, AttendanceMatch, MatchAttendanceStatus} from '@/domain/match-roster/MatchAttendance';
import {isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';

const MANAGER_STATUSES = new Set(['Scheduled', 'Postponed', 'Rain Delay']);
type BatchStatus = MatchAttendanceStatus | 'Unconfirmed';
type BatchChange = {playerId: string; status: BatchStatus};

export async function saveCaptainRosterAvailabilityBatch(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const teamId = readFormValue(formData, 'teamId');
  const rawChanges = readFormValue(formData, 'changes');
  if (!matchId || !teamId || !rawChanges) redirect('/captain?error=Match, team, and availability changes are required.');

  const path = `/matches/${encodeURIComponent(matchId)}?manage=roster`;
  const changes = parseBatchChanges(rawChanges);
  if (!changes?.length) redirect(`${path}&captainNotice=${encodeURIComponent('No roster changes to save.')}`);

  const context = await getManagementContext(matchId);
  if (!context || !context.teamIds.includes(teamId)) redirect(`${path}&captainError=${encodeURIComponent('You cannot manage that team roster.')}`);

  const teamPlayers = await context.repository.getTeamAttendance(matchId, teamId);
  const allowedPlayerIds = new Set(teamPlayers.map((player) => player.playerId));
  if (changes.some((change) => !allowedPlayerIds.has(change.playerId))) redirect(`${path}&captainError=${encodeURIComponent('One or more players are not on the roster you manage.')}`);

  const attendanceClient = context.supabase as any;
  const upserts = changes.filter((change): change is BatchChange & {status: MatchAttendanceStatus} => change.status !== 'Unconfirmed').map((change) => ({
    match_id: matchId,
    team_id: teamId,
    player_id: change.playerId,
    status: change.status,
    updated_by: context.actor.profileId,
  }));
  const clearIds = changes.filter((change) => change.status === 'Unconfirmed').map((change) => change.playerId);

  try {
    if (upserts.length) {
      const {error} = await attendanceClient.from('launch_match_attendance').upsert(upserts, {onConflict: 'match_id,player_id'});
      if (error) throw error;
    }
    if (clearIds.length) {
      const {error} = await attendanceClient.from('launch_match_attendance').delete().eq('match_id', matchId).eq('team_id', teamId).in('player_id', clearIds);
      if (error) throw error;
    }
  } catch (error) {
    console.error('Captain batch availability update failed.', {matchId, teamId, changeCount: changes.length, errorClass: error instanceof Error ? error.name : 'UnknownError'});
    redirect(`${path}&captainError=${encodeURIComponent('Roster changes could not be saved.')}`);
  }

  revalidatePath(`/matches/${matchId}`);
  redirect(`${path}&captainNotice=${encodeURIComponent(`${changes.length} roster change${changes.length === 1 ? '' : 's'} saved.`)}`);
}

export async function setCaptainRosterAvailability(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const playerId = readFormValue(formData, 'playerId');
  const status = readFormValue(formData, 'status');
  if (!matchId || !playerId || (status !== 'Playing' && status !== 'NotPlaying')) redirect('/captain?error=Match, player, and availability are required.');

  const path = `/matches/${encodeURIComponent(matchId)}?manage=roster`;
  const context = await getManagementContext(matchId);
  if (!context) redirect(`${path}&captainError=${encodeURIComponent('Roster management is closed for this match.')}`);
  const team = await findManagedPlayerTeam(context, playerId);
  if (!team) redirect(`${path}&captainError=${encodeURIComponent('That player is not on a team you manage for this match.')}`);

  try {
    await context.repository.saveAttendance({matchId, teamId: team, playerId, status: status as MatchAttendanceStatus, updatedBy: context.actor.profileId});
  } catch (error) {
    console.error('Captain availability update failed.', {matchId, playerId, errorClass: error instanceof Error ? error.name : 'UnknownError'});
    redirect(`${path}&captainError=${encodeURIComponent('Player availability could not be saved.')}`);
  }
  revalidatePath(`/matches/${matchId}`);
  redirect(`${path}&captainNotice=${encodeURIComponent('Player availability was updated.')}`);
}

export async function clearCaptainRosterAvailability(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const playerId = readFormValue(formData, 'playerId');
  if (!matchId || !playerId) redirect('/captain?error=Match and player are required.');

  const path = `/matches/${encodeURIComponent(matchId)}?manage=roster`;
  const context = await getManagementContext(matchId);
  if (!context) redirect(`${path}&captainError=${encodeURIComponent('Roster management is closed for this match.')}`);
  const team = await findManagedPlayerTeam(context, playerId);
  if (!team) redirect(`${path}&captainError=${encodeURIComponent('That player is not on a team you manage for this match.')}`);

  try {
    const attendanceClient = context.supabase as any;
    const {error} = await attendanceClient.from('launch_match_attendance').delete().eq('match_id', matchId).eq('team_id', team).eq('player_id', playerId);
    if (error) throw error;
  } catch (error) {
    console.error('Captain availability reset failed.', {matchId, playerId, errorClass: error instanceof Error ? error.name : 'UnknownError'});
    redirect(`${path}&captainError=${encodeURIComponent('Player availability could not be reset.')}`);
  }
  revalidatePath(`/matches/${matchId}`);
  redirect(`${path}&captainNotice=${encodeURIComponent('Player availability was reset to unconfirmed.')}`);
}

export async function confirmCaptainManagedRoster(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const teamId = readFormValue(formData, 'teamId');
  if (!matchId || !teamId) redirect('/captain?error=Match and team are required.');

  const path = `/matches/${encodeURIComponent(matchId)}?manage=roster`;
  const context = await getManagementContext(matchId);
  if (!context || !context.teamIds.includes(teamId)) redirect(`${path}&captainError=${encodeURIComponent('You cannot confirm that team roster.')}`);

  try {
    await context.repository.saveMatchRoster({matchId, teamId, confirmedBy: context.actor.profileId, confirmedAt: new Date().toISOString()});
    if (context.overrideTeamIds.has(teamId)) await relockOfficialSnapshot(context, teamId);
  } catch (error) {
    console.error('Captain roster confirmation failed.', {matchId, teamId, errorClass: error instanceof Error ? error.name : 'UnknownError'});
    redirect(`${path}&captainError=${encodeURIComponent('The roster could not be confirmed.')}`);
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/captain');
  redirect(`/matches/${encodeURIComponent(matchId)}?captainNotice=${encodeURIComponent(context.overrideTeamIds.has(teamId) ? 'Match roster confirmed and locked again.' : 'Match roster confirmed.')}`);
}

type ManagementContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  repository: SeasonAwareMatchRosterRepository;
  actor: AttendanceActor;
  match: AttendanceMatch;
  teamIds: string[];
  overrideTeamIds: Set<string>;
};

async function getManagementContext(matchId: string): Promise<ManagementContext | undefined> {
  const supabase = await createClient();
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
  const admin = createAdminClient() as any;
  const {data: unlock} = await admin.from('launch_match_roster_unlocks').select('team_id').eq('match_id', matchId).eq('team_id', actor.captainTeamId).is('relocked_at', null).maybeSingle();
  if (!unlock) return undefined;
  return {supabase, repository, actor, match, teamIds: [actor.captainTeamId], overrideTeamIds: new Set([actor.captainTeamId])};
}

async function relockOfficialSnapshot(context: ManagementContext, teamId: string) {
  const admin = createAdminClient() as any;
  const players = await context.repository.getTeamAttendance(context.match.id, teamId);
  const playingIds = players.filter((player) => player.status === 'Playing').map((player) => player.playerId);
  const {data: team} = await admin.from('launch_teams').select('name').eq('id', teamId).maybeSingle();
  if (!team?.name) throw new Error('Team snapshot name unavailable.');
  const {data: playerRows} = playingIds.length
    ? await admin.from('launch_players').select('id,name').in('id', playingIds)
    : {data: []};

  const now = new Date().toISOString();
  const {error: deleteError} = await admin.from('launch_match_roster_snapshot_players').delete().eq('match_id', context.match.id).eq('team_id', teamId);
  if (deleteError) throw deleteError;
  if (playerRows?.length) {
    const {error: insertError} = await admin.from('launch_match_roster_snapshot_players').insert(playerRows.map((player: {id: string; name: string}) => ({
      match_id: context.match.id,
      team_id: teamId,
      team_name_snapshot: team.name,
      player_id: player.id,
      player_name_snapshot: player.name,
      updated_by: context.actor.profileId,
      updated_at: now,
    })));
    if (insertError) throw insertError;
  }
  const {error: manifestError} = await admin.from('launch_match_roster_snapshots').update({updated_by: context.actor.profileId, updated_at: now, needs_commissioner_review: false}).eq('match_id', context.match.id).eq('team_id', teamId);
  if (manifestError) throw manifestError;
  const {error: relockError} = await admin.from('launch_match_roster_unlocks').update({relocked_at: now, relocked_by: context.actor.profileId}).eq('match_id', context.match.id).eq('team_id', teamId).is('relocked_at', null);
  if (relockError) throw relockError;
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
      if (!playerId || seen.has(playerId) || (status !== 'Playing' && status !== 'NotPlaying' && status !== 'Unconfirmed')) return undefined;
      seen.add(playerId);
      changes.push({playerId, status});
    }
    return changes;
  } catch {
    return undefined;
  }
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
