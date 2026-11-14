import 'server-only';
import {createHmac, timingSafeEqual} from 'node:crypto';
import {createAdminClient} from '@/lib/supabase/admin';
import {roundHomeSpreadLine, type SpreadVoteChoice} from './SpreadVote';

export type StoredSpreadVote = {
  homeLine: number;
  high: number;
  low: number;
  myVote: SpreadVoteChoice | null;
  frozenAt: string;
};

function signature(matchId: string, lineText: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Spread voting needs the server service key.');
  return createHmac('sha256', secret).update(matchId + '|' + lineText).digest('hex');
}

/** Token prevents forged lines in posted form data. */
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

/** The caller must authorize commissioner access before using privileged reads. */
export async function loadCommissionerSpreadVote(matchId: string, profileId: string): Promise<StoredSpreadVote | null> {
  const db = createAdminClient() as any;
  const {data: poll, error: pollError} = await db.from('launch_match_spread_polls')
    .select('home_line,created_at').eq('match_id', matchId).maybeSingle();
  if (pollError) throw pollError;
  if (!poll) return null;
  const {data: votes, error: voteError} = await db.from('launch_match_spread_votes')
    .select('profile_id,choice').eq('match_id', matchId);
  if (voteError) throw voteError;
  const entries = (votes ?? []) as {profile_id: string; choice: SpreadVoteChoice}[];
  return {
    homeLine: Number(poll.home_line),
    high: entries.filter(row => row.choice === 'high').length,
    low: entries.filter(row => row.choice === 'low').length,
    myVote: entries.find(row => row.profile_id === profileId)?.choice ?? null,
    frozenAt: String(poll.created_at),
  };
}
