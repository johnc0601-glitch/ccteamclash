'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {CCTEAMCLASH_LEAGUE_ID} from '@/domain/league/League';
import {createClient} from '@/lib/supabase/server';
import {isMatchPredictionVisibility} from '@/services/settings/MatchPredictionVisibility';

export async function updateMatchPredictionVisibility(formData: FormData) {
  const visibility = read(formData, 'visibility');
  if (!isMatchPredictionVisibility(visibility)) {
    redirect('/office/settings?error=Choose%20a%20valid%20matchup%20predictor%20visibility.');
  }

  const {supabase, profileId} = await requireCommissioner();
  const {error} = await (supabase as any)
    .from('launch_league_settings')
    .upsert({
      league_id: CCTEAMCLASH_LEAGUE_ID,
      matchup_prediction_visibility: visibility,
      updated_by_profile_id: profileId,
      updated_at: new Date().toISOString(),
    }, {onConflict: 'league_id'});

  if (error) {
    console.error('Match prediction visibility could not be updated.', {error: error.message});
    redirect('/office/settings?error=Matchup%20predictor%20visibility%20could%20not%20be%20saved.');
  }

  revalidatePath('/office/settings');
  revalidatePath('/matches/[id]', 'page');
  redirect('/office/settings?notice=Matchup%20predictor%20visibility%20saved.');
}

async function requireCommissioner() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account');

  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('id,role,status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'Commissioner' || profile.status !== 'Approved') {
    redirect('/account');
  }

  return {supabase, profileId: profile.id};
}

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
