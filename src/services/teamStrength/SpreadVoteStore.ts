import 'server-only';
import {createHmac, timingSafeEqual} from 'node:crypto';
import {createAdminClient} from '@/lib/supabase/admin';
import {roundHomeSpreadLine, type SpreadVoteChoice} from './SpreadVote';

export type ClashLineMovement = {
  openingHomeLine: number;
  currentHomeLine: number;
};

export type StoredSpreadVote = ClashLineMovement & {
  myVote: SpreadVoteChoice | null;
  myAcceptedHomeLine: number | null;
};

function signature(matchId: string, lineText: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Spread voting needs the server service key.');
  return createHmac('sha256', secret).update(matchId + '|' + lineText).digest('hex');
}

/** Token stops browser submissions from inventing a different current line. */
export function signSpreadVoteLine(matchId: string, line: number): string {
  const rounded = roundHomeSpreadLine(line);
  if (rounded === null || rounded === 0 || rounded !== line) throw new Error('Invalid spread line.');
  const text = line.toFixed(1);
  return text + '|' + signature(matchId, text);
}

export function verifySpreadVoteLine(matchId: string, token: string): number | null {
  if (!/^-?\d{1,2}\.[05]\|[0-9a-f]{64}$/.test(token)) return null;
  const [text, supplied] = token.split('|');
  const expected = signature(matchId, text);
  if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'))) return null;
  const line = Number(text);
  return line !== 0 && roundHomeSpreadLine(line) === line ? line : null;
}

/** Public read returns two numbers only; private vote records are never sent to a public component. */
export async function loadPublicClashLine(matchId: string): Promise<ClashLineMovement | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const db = createAdminClient() as any;
  const {data: poll, error} = await db.from('launch_match_spread_polls')
    .select('home_line').eq('match_id', matchId).maybeSingle();
  if (error) {
    console.error('Fixed Clash Challenge projection unavailable.', {matchId, errorCode: error.code});
    return null;
  }
  if (!poll) return null;
  const openingHomeLine = Number(poll.home_line);
  const currentHomeLine = openingHomeLine;
  if (!openingHomeLine || roundHomeSpreadLine(openingHomeLine) !== openingHomeLine) return null;
  return {openingHomeLine, currentHomeLine};
}

/** Call only after verifying the visitor is an approved commissioner. */
export async function loadCommissionerSpreadVote(matchId: string, profileId: string): Promise<StoredSpreadVote | null> {
  const db = createAdminClient() as any;
  const {data: poll, error: pollError} = await db.from('launch_match_spread_polls')
    .select('home_line').eq('match_id', matchId).maybeSingle();
  if (pollError) throw pollError;
  if (!poll) return null;
  const {data: vote, error: voteError} = await db.from('launch_match_spread_votes')
    .select('choice,accepted_home_line').eq('match_id', matchId).eq('profile_id', profileId).maybeSingle();
  if (voteError) throw voteError;
  return {
    openingHomeLine: Number(poll.home_line),
    currentHomeLine: Number(poll.home_line),
    myVote: vote?.choice === 'low' || vote?.choice === 'high' ? vote.choice : null,
    myAcceptedHomeLine: vote?.accepted_home_line == null ? null : Number(vote.accepted_home_line),
  };
}


/** Store one projection per matchup on its first display during the open round. */
export async function freezeClashChallengeProjection(matchId: string, estimatedHomeLine: number | null): Promise<number | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const db = createAdminClient() as any;
  const {data, error} = await db.rpc('freeze_clash_challenge_projection', {p_match_id: matchId, p_home_line: estimatedHomeLine});
  if (error) {
    console.error('Clash Challenge projection freeze failed.', {matchId, code: error.code});
    return null;
  }
  if (data == null) return null;
  const value = Number(data);
  return value !== 0 && roundHomeSpreadLine(value) === value ? value : null;
}
