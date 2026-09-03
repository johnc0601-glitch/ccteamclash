'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

type FreeAgencyClient = {
  rpc: (
    fn: 'submit_launch_free_agent_application',
    args: {
      target_season_id: string;
      target_player_type: 'Adult' | 'Junior';
      target_gender: 'Male' | 'Female';
    },
  ) => Promise<{error: {message: string} | null}>;
};

export async function joinFreeAgency(formData: FormData) {
  const seasonId = readFormValue(formData, 'seasonId');
  const playerType = readPlayerType(readFormValue(formData, 'playerType'));
  let gender = readGender(readFormValue(formData, 'gender'));

  if (!seasonId || !playerType || !gender) {
    redirect('/account/free-agency?error=Complete all Free Agency fields.');
  }

  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) redirect('/account?error=Sign in first.');

  const launchSupabase = supabase as any;
  const {data: profile, error: profileError} = await launchSupabase
    .from('launch_profiles')
    .select('player_id, status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profileError) redirect(`/account/free-agency?error=${encodeURIComponent(profileError.message)}`);
  if (!profile || profile.status === 'Rejected' || profile.status === 'Suspended') {
    redirect('/account/free-agency?error=This league account cannot enter Free Agency.');
  }

  if (profile.player_id) {
    const [{data: playerRow, error: playerError}, {data: genderLocked, error: genderLockError}] = await Promise.all([
      launchSupabase
        .from('launch_players')
        .select('gender')
        .eq('id', profile.player_id)
        .maybeSingle(),
      launchSupabase.rpc('launch_player_gender_locked', {target_player_id: profile.player_id}),
    ]);
    if (playerError) redirect(`/account/free-agency?error=${encodeURIComponent(playerError.message)}`);
    if (genderLockError) redirect(`/account/free-agency?error=${encodeURIComponent(genderLockError.message)}`);

    if (genderLocked === true) {
      const establishedGender = readGender(playerRow?.gender ?? '');
      if (!establishedGender) {
        redirect('/account/free-agency?error=Your permanent division is missing. Ask the commissioner to review your player record.');
      }
      gender = establishedGender;
    }
  }

  const {error} = await (supabase as unknown as FreeAgencyClient).rpc(
    'submit_launch_free_agent_application',
    {
      target_season_id: seasonId,
      target_player_type: playerType,
      target_gender: gender,
    },
  );
  if (error) redirect(`/account/free-agency?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/account');
  revalidatePath('/account/free-agency');
  revalidatePath('/captain');
  revalidatePath('/captain/free-agents');
  revalidatePath('/office/players');
  redirect('/account/free-agency?notice=You are now listed in the Free Agent Pool for captains.');
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function readPlayerType(value: string): 'Adult' | 'Junior' | null {
  return value === 'Adult' || value === 'Junior' ? value : null;
}

function readGender(value: string): 'Male' | 'Female' | null {
  return value === 'Male' || value === 'Female' ? value : null;
}
