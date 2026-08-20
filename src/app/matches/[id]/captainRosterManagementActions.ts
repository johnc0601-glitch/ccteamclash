'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import type {AttendanceActor, AttendanceMatch, MatchAttendanceStatus} from '@/domain/match-roster/MatchAttendance';
import {isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {createClient} from '@/lib/supabase/server';

const MANAGER_STATUSES = new Set(['Scheduled', 'Postponed', 'Rain Delay']);

export async function setCaptainRosterAvailability(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const playerId = readFormValue(formData, 'playerId');
  const status = readFormValue(formData, 'status');
  if (!matchId || !playerId || (status !== 'Playing' && status !== 'NotPlaying')) {
    redirect('/captain?error=Match, player, and availability are required.');
  }

  const path = `/matches/${encodeURIComponent(matchId)}?manage=roster`;
  const context = await getManagementContext(matchId);
  if (!context) redirect(`${path}&captainError=${encodeURIComponent('Roster management is closed for this match.')}`);

  const team = await findManagedPlayerTeam(context, playerId);
  if (!team) redirect(`${path}&captainError=${encodeURIComponent('That player is not on a team you manage for this match.')}`);

  try {
    await context.repository.saveAttendance({
      matchId,
      teamId: team,
      playerId,
      status: status as MatchAttendanceStatus,
      updatedBy: context.actor.profileId,
    });
  } catch (error) {
    console.error('Captain availability update failed.', {
      matchId,
      playerId,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
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
    const {error} = await attendanceClient
      .from('launch_match_attendance')
      .delete()
      .eq('match_id', matchId)
      .eq('team_id', team)
      .eq('player_id', playerId);
    if (error) throw error;
  } catch (error) {
    console.error('Captain availability reset failed.', {
      matchId,
      playerId,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
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
  if (!context || !context.teamIds.includes(teamId)) {
    redirect(`${path}&captainError=${encodeURIComponent('You cannot confirm that team roster.')}`);
  }

  try {
    await context.repository.saveMatchRoster({
      matchId,
      teamId,
      confirmedBy: context.actor.profileId,
      confirmedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Captain roster confirmation failed.', {
      matchId,
      teamId,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    redirect(`${path}&captainError=${encodeURIComponent('The roster could not be confirmed.')}`);
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/captain');
  redirect(`${path}&captainNotice=${encodeURIComponent('Match roster confirmed.')}`);
}

type ManagementContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  repository: SeasonAwareMatchRosterRepository;
  actor: AttendanceActor;
  match: AttendanceMatch;
  teamIds: string[];
};

async function getManagementContext(matchId: string): Promise<ManagementContext | undefined> {
  const supabase = await createClient();
  const {data: {user}, error} = await supabase.auth.getUser();
  if (error || !user) redirect(`/account?error=${encodeURIComponent('Sign in with an approved captain account.')}`);

  const repository = new SeasonAwareMatchRosterRepository(supabase);
  const [actor, match] = await Promise.all([
    repository.getAttendanceActor(user.id),
    repository.getAttendanceMatch(matchId),
  ]);
  if (!actor || actor.profileStatus !== 'Approved' || !match || !isManagementOpen(match)) return undefined;

  const matchTeamIds = [match.awayTeamId, match.homeTeamId].filter((teamId): teamId is string => Boolean(teamId));
  if (actor.profileRole === 'Commissioner') {
    return {supabase, repository, actor, match, teamIds: matchTeamIds};
  }
  if (actor.profileRole === 'Captain' && actor.captainTeamId && matchTeamIds.includes(actor.captainTeamId)) {
    return {supabase, repository, actor, match, teamIds: [actor.captainTeamId]};
  }
  return undefined;
}

async function findManagedPlayerTeam(context: ManagementContext, playerId: string): Promise<string | undefined> {
  const rosters = await Promise.all(context.teamIds.map(async (teamId) => ({
    teamId,
    players: await context.repository.getTeamAttendance(context.match.id, teamId),
  })));
  return rosters.find((roster) => roster.players.some((player) => player.playerId === playerId))?.teamId;
}

function isManagementOpen(match: AttendanceMatch): boolean {
  return Boolean(
    match.date
    && MANAGER_STATUSES.has(match.status)
    && !isMatchRosterLocked(match)
  );
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
