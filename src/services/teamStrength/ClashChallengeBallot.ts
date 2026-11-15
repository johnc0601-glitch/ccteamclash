import type {SpreadVoteChoice} from './SpreadVote';

export type BallotPick = {matchId: string; choice: SpreadVoteChoice; lineToken: string};

export function isApprovedCommissionerClashPlayer(profile: {
  role?: string | null; status?: string | null; playerId?: string | null;
} | null | undefined): boolean {
  return profile?.status === 'Approved' && profile.role === 'Commissioner';
}

export function parseClashBallot(value: unknown): BallotPick[] | null {
  if (typeof value !== 'string' || value.length > 4000) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 4) return null;
  const seen = new Set<string>();
  const ballot: BallotPick[] = [];
  for (const p of parsed) {
    if (!p || Array.isArray(p) || typeof p !== 'object') return null;
    const {matchId, choice, lineToken} = p as Record<string,unknown>;
    if (typeof matchId !== 'string' || !/^[\w-]{2,220}$/.test(matchId)
      || seen.has(matchId) || (choice !== 'high' && choice !== 'low')
      || typeof lineToken !== 'string' || lineToken.length > 150) return null;
    seen.add(matchId);
    ballot.push({matchId,choice,lineToken});
  }
  return ballot;
}
