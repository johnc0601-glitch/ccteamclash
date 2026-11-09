'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export async function saveOfficeRoster(
  matchId: string,
  teamId: string,
  _previous: string,
  form: FormData,
): Promise<string> {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  const profile = user && await new SupabaseLaunchRepository(supabase).getProfileByUserId(user.id);
  if (!profile || profile.role !== 'Commissioner' || profile.status !== 'Approved') {
    return 'Approved commissioner access is required.';
  }

  const changes = [];
  for (const [key, status] of form) {
    if (!key.startsWith('player:') || status === '') continue;
    if (status !== 'Playing' && status !== 'NotPlaying' && status !== 'Unconfirmed') {
      return 'Choose a valid availability status.';
    }
    changes.push({player_id: key.slice('player:'.length), status});
  }
  if (!changes.length) return 'Choose at least one availability change before saving.';

  const {error} = await (supabase as any).rpc('captain_save_unlocked_match_roster', {
    target_match_id: matchId,
    target_team_id: teamId,
    p_changes: changes,
  });
  if (error) {
    if (error.code === '42501') return 'This roster is no longer open for correction. Check the match page.';
    console.error('Office roster correction failed.', {matchId, teamId, error});
    return 'The roster could not be saved. Check that each selected player is eligible for this match.';
  }

  revalidatePath('/office/teams');
  revalidatePath('/office/results');
  revalidatePath('/matches/[id]', 'page');
  redirect('/office/teams?rosterSaved=1');
}
