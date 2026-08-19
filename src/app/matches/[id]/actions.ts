'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import type {AttendanceResult, PersonalAttendance} from '@/domain/match-roster/MatchAttendance';
import type {ManagedTeamRoster} from '@/domain/match-roster/MatchAttendance';
import {createClient} from '@/lib/supabase/server';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';

export async function setOwnMatchAttendance(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const status = readFormValue(formData, 'status');
  if (!matchId) redirect('/schedule?error=Match is required.');

  const path = `/matches/${encodeURIComponent(matchId)}`;
  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) redirect(`/account?error=${encodeURIComponent('Sign in to set your attendance.')}`);

  let result: AttendanceResult<PersonalAttendance>;
  try {
    const service = new MatchRosterService(new SeasonAwareMatchRosterRepository(supabase));
    result = await service.setOwnAttendance(user.id, matchId, status);
  } catch {
    redirect(`${path}?attendanceError=${encodeURIComponent('Attendance could not be saved. Try again.')}`);
  }
  if (!result.ok) redirect(`${path}?attendanceError=${encodeURIComponent(result.message)}`);

  revalidatePath(path);
  redirect(`${path}?attendanceNotice=${encodeURIComponent('Your availability was saved.')}`);
}

export async function setCaptainMatchAttendance(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const playerId = readFormValue(formData, 'playerId');
  const status = readFormValue(formData, 'status');
  if (!matchId || !playerId) redirect('/captain?error=Match and player are required.');

  const path = `/matches/${encodeURIComponent(matchId)}?manage=roster`;
  const {service, userId} = await getMatchRosterService();
  let result: AttendanceResult<ManagedTeamRoster>;
  try {
    result = await service.setTeamAttendance(userId, matchId, playerId, status);
  } catch {
    redirect(`${path}&captainError=${encodeURIComponent('Player attendance could not be saved.')}`);
  }
  if (!result.ok) redirect(`${path}&captainError=${encodeURIComponent(result.message)}`);

  revalidatePath(`/matches/${matchId}`);
  redirect(`${path}&captainNotice=${encodeURIComponent('Player availability was updated.')}`);
}

export async function clearCaptainMatchAttendance(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const playerId = readFormValue(formData, 'playerId');
  if (!matchId || !playerId) redirect('/captain?error=Match and player are required.');

  const path = `/matches/${encodeURIComponent(matchId)}?manage=roster`;
  const {service, userId, supabase} = await getMatchRosterService();
  const managedRosters = await service.getManagedTeamRosters(userId, matchId);
  const authorizedRoster = managedRosters.find((roster) => (
    roster.attendanceOpen
    && roster.players.some((player) => player.playerId === playerId)
  ));
  if (!authorizedRoster) {
    redirect(`${path}&captainError=${encodeURIComponent('That player cannot be reset for this match.')}`);
  }

  try {
    const attendanceClient = supabase as any;
    const {error} = await attendanceClient
      .from('launch_match_attendance')
      .delete()
      .eq('match_id', matchId)
      .eq('team_id', authorizedRoster.teamId)
      .eq('player_id', playerId);
    if (error) throw error;
  } catch {
    redirect(`${path}&captainError=${encodeURIComponent('Player attendance could not be reset.')}`);
  }

  revalidatePath(`/matches/${matchId}`);
  redirect(`${path}&captainNotice=${encodeURIComponent('Player availability was reset to unconfirmed.')}`);
}

export async function confirmCaptainMatchRoster(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const teamId = readFormValue(formData, 'teamId');
  if (!matchId || !teamId) redirect('/captain?error=Match and team are required.');

  const path = `/matches/${encodeURIComponent(matchId)}?manage=roster`;
  const {service, userId} = await getMatchRosterService();
  let result: AttendanceResult<ManagedTeamRoster>;
  try {
    result = await service.confirmTeamRoster(userId, matchId, teamId);
  } catch {
    redirect(`${path}&captainError=${encodeURIComponent('The roster could not be confirmed.')}`);
  }
  if (!result.ok) redirect(`${path}&captainError=${encodeURIComponent(result.message)}`);

  revalidatePath(`/matches/${matchId}`);
  revalidatePath('/captain');
  redirect(`${path}&captainNotice=${encodeURIComponent('Match roster confirmed.')}`);
}

export async function addCommissionerSnapshotPlayer(formData: FormData) {
  await runCommissionerSnapshotAction(formData, 'add');
}

export async function removeCommissionerSnapshotPlayer(formData: FormData) {
  await runCommissionerSnapshotAction(formData, 'remove');
}

async function runCommissionerSnapshotAction(formData: FormData, operation: 'add' | 'remove') {
  const matchId = readFormValue(formData, 'matchId');
  const teamId = readFormValue(formData, 'teamId');
  const playerId = readFormValue(formData, 'playerId');
  if (!matchId || !teamId || !playerId) redirect('/schedule?error=Match, team, and player are required.');
  const path = `/matches/${encodeURIComponent(matchId)}?manage=roster`;
  const {service, userId} = await getMatchRosterService();
  let result: AttendanceResult<OfficialMatchRoster>;
  try {
    result = operation === 'add'
      ? await service.commissionerAddSnapshotPlayer(userId, matchId, teamId, playerId)
      : await service.commissionerRemoveSnapshotPlayer(userId, matchId, teamId, playerId);
  } catch {
    redirect(`${path}&commissionerError=${encodeURIComponent('Official roster correction could not be saved.')}`);
  }
  if (!result.ok) redirect(`${path}&commissionerError=${encodeURIComponent(result.message)}`);
  revalidatePath(`/matches/${matchId}`);
  redirect(`${path}&commissionerNotice=${encodeURIComponent(operation === 'add' ? 'Player added to the official roster.' : 'Player removed from the official roster.')}`);
}

async function getMatchRosterService() {
  const supabase = await createClient();
  const {data: {user}, error} = await supabase.auth.getUser();
  if (error || !user) redirect(`/account?error=${encodeURIComponent('Sign in with an approved captain account.')}`);

  return {
    service: new MatchRosterService(new SeasonAwareMatchRosterRepository(supabase)),
    userId: user.id,
    supabase,
  };
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
