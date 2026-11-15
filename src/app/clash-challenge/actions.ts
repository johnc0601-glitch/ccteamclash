'use server';

import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {isRegisteredClashPlayer,parseClashBallot} from '@/services/teamStrength/ClashChallengeBallot';
import {verifySpreadVoteLine} from '@/services/teamStrength/SpreadVoteStore';

function respond(kind:'saved'|'error',message:string):never {
  redirect('/clash-challenge?' + kind + '=' + encodeURIComponent(message));
}

/** A single verified transaction saves every changed pick, or none of them. */
export async function saveClashChallengeBallot(formData: FormData): Promise<void> {
  const ballot = parseClashBallot(formData.get('ballot'));
  if (!ballot) respond('error','Choose a team before saving your picks.');

  const client = await createClient();
  const {data:{user}} = await client.auth.getUser();
  if (!user) redirect('/account?error='+encodeURIComponent('Sign in to play Clash Challenge.'));

  const {data:profile,error:profileError} = await client.from('launch_profiles')
    .select('id,role,status,player_id').eq('user_id',user.id).maybeSingle();
  if (profileError || !isRegisteredClashPlayer({
    role:profile?.role,status:profile?.status,playerId:profile?.player_id,
  })) {
    respond('error','An approved player registration is required to save picks.');
  }
  const picks = ballot.map(p=>({
    match_id:p.matchId,
    choice:p.choice,
    expected_home_line:verifySpreadVoteLine(p.matchId,p.lineToken),
  }));
  if (picks.some(p=>p.expected_home_line == null)) {
    respond('error','A projection changed. Review your picks and try again.');
  }
  const db = createAdminClient() as any;
  const {error} = await db.rpc('cast_clash_challenge_ballot',{
    p_profile_id:profile!.id,
    p_user_id:user.id,
    p_items:picks,
  });
  if (error) {
    if (/stale_clash_line|clash_picks_closed|clash_round_changed/i.test(error.message)) {
      respond('error','A match closed or a projection changed. Review the updated matches and save again.');
    }
    console.error('Clash Challenge ballot failed',{code:error.code,message:error.message});
    respond('error','Your picks could not be saved. Try again.');
  }
  revalidatePath('/clash-challenge');
  respond('saved','Your Clash Challenge picks were saved.');
}
