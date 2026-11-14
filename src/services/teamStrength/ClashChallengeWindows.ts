import {isSpreadVoteOpen} from './SpreadVote';

/** An exclusive Eastern-time window for the one featured Clash Challenge round. */
export type ClashChallengeWindow = {
  opensAt: string;
  closesAt: string;
};

export type ChallengeMatch = {
  date: string | null;
  time: string | null;
  status: string;
};

/** Match results or an expired/non-featured round never display the game. */
export function isClashChallengeVisible(
  match: ChallengeMatch,
  window: ClashChallengeWindow | null,
  hasPublishedResult: boolean,
  now: Date = new Date(),
): boolean {
  if (!window || hasPublishedResult || !isSpreadVoteOpen(match, now)) return false;
  const opens = Date.parse(window.opensAt);
  const closes = Date.parse(window.closesAt);
  if (!Number.isFinite(opens) || !Number.isFinite(closes) || opens >= closes) return false;
  return now.getTime() >= opens && now.getTime() < closes;
}
