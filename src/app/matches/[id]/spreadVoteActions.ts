'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getPublicMatchHref} from '@/services/matches/MatchPublicIdentity';
import {isApprovedCommissioner} from '@/services/teamStrength/SpreadVote';
import {verifySpreadVoteLine} from '@/services/teamStrength/SpreadVoteStore';
import {isClashChallengeVisible} from '@/services/teamStrength/ClashChallengeWindows';
import {loadClashChallengeWindow} from '@/services/teamStrength/ClashChallengeWindowStore';

function read(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function castCommissionerSpreadVote(formData: FormData): Promise<void> {
  const matchId = read(formData, 'matchId');
  const choice = read(formData, 'choice');
  const token = read(formData, 'lineToken');
  if (!matchId || matchId.length > 220 || (choice !== 'high' && choice !== 'low')) return;

  const client = await createClient();
  const {data: {user}} = await client.auth.getUser();
  if (!user) redirect('/account?error=' + encodeURIComponent('Sign in to play Clash Challenge.'));

  const {data: profile, error: profileError} = await client.from('launch_profiles')
    .select('id,role,status').eq('user_id', user.id).maybeSingle();
  if (profileError || !profile || !isApprovedCommissioner({profileRole: profile.role, profileStatus: profile.status})) {
    redirect('/account?error=' + encodeURIComponent('Commissioner access is required for Clash Challenge.'));
  }

  const db = createAdminClient() as any;
  const {data: match, error: matchError} = await db.from('launch_schedule_matches')
    .select('id,round_id,date,time,status').eq('id', matchId).maybeSingle();
  if (matchError || !match) return;

  const href = await getPublicMatchHref(client, matchId);
  const feedback = (key: 'spreadVoteNotice' | 'spreadVoteError', message: string) =>
    href + '?' + key + '=' + encodeURIComponent(message) + '#commissioner-spread-vote';
  const window = await loadClashChallengeWindow(match.round_id);
  if (!isClashChallengeVisible(match, window, false)) {
    redirect(feedback('spreadVoteError', 'Clash Challenge is not open for this round.'));
  }

  const acceptedLine = verifySpreadVoteLine(matchId, token);
  if (acceptedLine === null) redirect(feedback('spreadVoteError', 'The projection has changed. Reload and pick again.'));

  // Save the pick against the frozen projection in one transaction.
  const {error} = await db.rpc('cast_clash_spread_pick', {
    p_match_id: matchId,
    p_profile_id: profile.id,
    p_choice: choice,
    p_expected_home_line: acceptedLine,
  });
  if (error) {
    if (/stale_clash_line/i.test(error.message)) {
      redirect(feedback('spreadVoteError', 'The projection changed. Review the updated result and pick again.'));
    }
    console.error('Clash Line pick could not be saved.', {matchId, errorCode: error.code, errorMessage: error.message});
    redirect(feedback('spreadVoteError', 'Your pick could not be saved. Try again.'));
  }
  revalidatePath(href);
  revalidatePath('/matches/' + encodeURIComponent(matchId));
  redirect(feedback('spreadVoteNotice', 'Your pick is saved against the fixed Clash Challenge projection.'));
}
