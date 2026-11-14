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
  if (!user) redirect('/account?error=' + encodeURIComponent('Sign in to vote on the point spread.'));

  const {data: profile, error: profileError} = await client.from('launch_profiles')
    .select('id,role,status').eq('user_id', user.id).maybeSingle();
  if (profileError || !profile || !isApprovedCommissioner({profileRole: profile.role, profileStatus: profile.status})) {
    redirect('/account?error=' + encodeURIComponent('Commissioner access is required for spread voting.'));
  }

  const db = createAdminClient() as any;
  const {data: match, error: matchError} = await db.from('launch_schedule_matches')
    .select('id,date,time,status,home_team_id,away_team_id').eq('id', matchId).maybeSingle();
  if (matchError || !match) return;
  const href = await getPublicMatchHref(client, matchId);
  const feedback = (key: 'spreadVoteNotice' | 'spreadVoteError', message: string) =>
    href + '?' + key + '=' + encodeURIComponent(message) + '#commissioner-spread-vote';

  if (!isSpreadVoteOpen(match)) redirect(feedback('spreadVoteError', 'Voting is closed for this match.'));
  const line = verifySpreadVoteLine(matchId, token);
  if (line === null) redirect(feedback('spreadVoteError', 'Invalid or outdated spread. Reload the matchup before voting.'));

  // First ballot permanently fixes the line. Duplicate requests never replace it.
  const {error: insertError} = await db.from('launch_match_spread_polls').upsert({
    match_id: matchId, home_team_id: match.home_team_id,
    away_team_id: match.away_team_id, home_line: line,
    created_by_profile_id: profile.id,
  }, {onConflict: 'match_id', ignoreDuplicates: true});
  if (insertError) {
    console.error('Spread poll creation failed.', {matchId, error: insertError.message});
    redirect(feedback('spreadVoteError', 'The voting line could not be saved.'));
  }
  const {data: poll, error: pollError} = await db.from('launch_match_spread_polls')
    .select('home_line,home_team_id,away_team_id').eq('match_id', matchId).single();
  if (pollError || !poll || Number(poll.home_line) !== line
    || poll.home_team_id !== match.home_team_id || poll.away_team_id !== match.away_team_id) {
    redirect(feedback('spreadVoteError', 'The line was frozen or teams changed. Review the line and vote again.'));
  }

  // One saved selection per commissioner per match. It can be changed before tee time.
  const {error: voteError} = await db.from('launch_match_spread_votes').upsert({
    match_id: matchId, profile_id: profile.id, choice,
    updated_at: new Date().toISOString(),
  }, {onConflict: 'match_id,profile_id'});
  if (voteError) {
    console.error('Spread ballot save failed.', {matchId, error: voteError.message});
    redirect(feedback('spreadVoteError', 'Your vote could not be saved.'));
  }
  revalidatePath(href);
  revalidatePath('/matches/' + encodeURIComponent(matchId));
  redirect(feedback('spreadVoteNotice', 'Your Clash Spread Challenge pick is saved.'));
}
