'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

const CORRECTABLE_STATUSES = new Set(['Scheduled', 'Postponed', 'Rain Delay']);

export async function unlockCaptainRoster(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const teamId = read(formData, 'teamId');
  if (!matchId || !teamId) return;
  const {supabase, profile} = await requireCommissioner(matchId);
  const db = supabase as any;
  const {data: match} = await supabase.from('launch_schedule_matches').select('home_team_id,away_team_id,status').eq('id', matchId).maybeSingle();
  if (!match || !CORRECTABLE_STATUSES.has(match.status) || ![match.home_team_id, match.away_team_id].includes(teamId)) {
    redirect(`/matches/${encodeURIComponent(matchId)}?commissionerError=${encodeURIComponent('That roster cannot be unlocked.')}`);
  }
  const {data: existing} = await db.from('launch_match_roster_unlocks').select('id').eq('match_id', matchId).eq('team_id', teamId).is('relocked_at', null).maybeSingle();
  if (!existing) {
    const {error} = await db.from('launch_match_roster_unlocks').insert({match_id: matchId, team_id: teamId, unlocked_by: profile.id});
    if (error) redirect(`/matches/${encodeURIComponent(matchId)}?commissionerError=${encodeURIComponent('Roster unlock failed.')}`);
  }
  revalidatePath(`/matches/${matchId}`);
  redirect(`/matches/${encodeURIComponent(matchId)}?commissionerNotice=${encodeURIComponent('Roster unlocked for the captain. It will lock again when the captain saves the correction.')}`);
}

export async function cancelCaptainRosterUnlock(formData: FormData) {
  const matchId = read(formData, 'matchId');
  const teamId = read(formData, 'teamId');
  if (!matchId || !teamId) return;
  const {supabase, profile} = await requireCommissioner(matchId);
  const db = supabase as any;
  const {error} = await db.from('launch_match_roster_unlocks').update({relocked_at: new Date().toISOString(), relocked_by: profile.id}).eq('match_id', matchId).eq('team_id', teamId).is('relocked_at', null);
  if (error) redirect(`/matches/${encodeURIComponent(matchId)}?commissionerError=${encodeURIComponent('Roster unlock could not be cancelled.')}`);
  revalidatePath(`/matches/${matchId}`);
  redirect(`/matches/${encodeURIComponent(matchId)}?commissionerNotice=${encodeURIComponent('Roster unlock cancelled.')}`);
}

async function requireCommissioner(matchId: string) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect(`/account?error=${encodeURIComponent('Commissioner sign-in required.')}`);
  const {data: profile} = await supabase.from('launch_profiles').select('id,role,status').eq('user_id', user.id).maybeSingle();
  if (!profile || profile.role !== 'Commissioner' || profile.status !== 'Approved') redirect(`/matches/${encodeURIComponent(matchId)}?commissionerError=${encodeURIComponent('Commissioner access is required.')}`);
  return {supabase, profile};
}

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
