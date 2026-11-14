'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getPublicMatchHref} from '@/services/matches/MatchPublicIdentity';
import {isApprovedCommissioner, isSpreadVoteOpen} from '@/services/teamStrength/SpreadVote';
import {verifySpreadVoteLine} from '@/services/teamStrength/SpreadVoteStore';

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
  if (!user) redirect('/account?error=' + encodeURIComponent('Sign in to pick the Clash Line.'));

  const {data: profile, error: profileError} = await client.from('launch_profiles')
    .select('id,role,status').eq('user_id', user.id).maybeSingle();
  if (profileError || !profile || !isApprovedCommissioner({profileRole: profile.role, profileStatus: profile.status})) {
    redirect('/account?error=' + encodeURIComponent('Commissioner access is required for the Clash Spread Challenge.'));
  }

  const db = createAdminClient() as any;
  const {data: match, error: matchError} = await db.from('launch_schedule_matches')
    .select('id,date,time,status').eq('id', matchId).maybeSingle();
  if (matchError || !match) return;

  const href = await getPublicMatchHref(client, matchId);
  const feedback = (key: 'spreadVoteNotice' | 'spreadVoteError', message: string) =>
    href + '?' + key + '=' + encodeURIComponent(message) + '#commissioner-spread-vote';
  if (!isSpreadVoteOpen(match)) redirect(feedback('spreadVoteError', 'Picks are closed for this matchup.'));

  const acceptedLine = verifySpreadVoteLine(matchId, token);
  if (acceptedLine === null) redirect(feedback('spreadVoteError', 'The displayed line is no longer valid. Reload and try again.'));

  // The database locks the match row, checks the current quote, saves the accepted
  // line for this pick, and recalculates the market line in a single transaction.
  const {error} = await db.rpc('cast_clash_spread_pick', {
    p_match_id: matchId,
    p_profile_id: profile.id,
    p_choice: choice,
    p_expected_home_line: acceptedLine,
  });
  if (error) {
    if (/stale_clash_line/i.test(error.message)) {
      redirect(feedback('spreadVoteError', 'The Clash Line moved. Review the updated line and pick again.'));
    }
    console.error('Clash Line pick could not be saved.', {matchId, errorCode: error.code, errorMessage: error.message});
    redirect(feedback('spreadVoteError', 'Your pick could not be saved. Try again.'));
  }
  revalidatePath(href);
  revalidatePath('/matches/' + encodeURIComponent(matchId));
  redirect(feedback('spreadVoteNotice', 'Your pick is saved at the line displayed when you picked.'));
}
