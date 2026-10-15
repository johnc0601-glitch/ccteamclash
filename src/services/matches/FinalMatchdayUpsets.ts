import type {FinalMatchContest, FinalMatchdayV2Snapshot} from './FinalMatchdayCanary';

export type PublishedUpsetContest = {
  format: 'Singles' | 'Doubles';
  position: number;
  homePlayers: string[];
  awayPlayers: string[];
  winner: 'Home' | 'Away';
  winningProbability: number;
};
export type PublishedUpsetMatch = {
  matchId: string;
  date: string;
  homeTeamName: string;
  awayTeamName: string;
  contests: PublishedUpsetContest[];
};
export type ScoreboardUpset = {
  side: 'Home' | 'Away';
  probability: number;
  label: string;
};
export type ScoreboardUpsets = Record<string, ScoreboardUpset>;

export function matchupKey(contest: Pick<FinalMatchContest, 'format' | 'position'>) {
  return `${contest.format}:${contest.position}`;
}

const normalize = (name: string) => name.toLowerCase()
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const sameNames = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length
  && left.map(normalize).sort().join('|') === right.map(normalize).sort().join('|');

/** Strict post-result verification. Only published, frozen, underdog victories
 * with exactly matching players, format, sides and date get labels.
 * Never use current CI; never label an unplayed/forfeit position. */
export function getVerifiedUpsets(
  snapshot: Pick<FinalMatchdayV2Snapshot,
    'matchId' | 'date' | 'homeTeam' | 'awayTeam' | 'contests'>,
  published: readonly PublishedUpsetMatch[],
): ScoreboardUpsets {
  const matching = published.filter((item) =>
    item.date === snapshot.date
    && normalize(item.homeTeamName) === normalize(snapshot.homeTeam.name)
    && normalize(item.awayTeamName) === normalize(snapshot.awayTeam.name)
  );
  if (matching.length !== 1) return {};
  const source = matching[0];
  const results: ScoreboardUpsets = {};

  for (const contest of snapshot.contests) {
    if (contest.unplayed) continue;
    const winner = contest.homeOutcome === 'W' && contest.awayOutcome === 'L' ? 'Home'
      : contest.awayOutcome === 'W' && contest.homeOutcome === 'L' ? 'Away' : null;
    if (!winner) continue;
    // TCWhiteboard order may differ from the league's published lineup order.
    // Require the full player set on BOTH sides instead of matching row numbers.
    const candidates = source.contests.filter((item) =>
      item.format === contest.format
      && item.winner === winner
      && sameNames(item.homePlayers, contest.homePlayers.map((p) => p.name))
      && sameNames(item.awayPlayers, contest.awayPlayers.map((p) => p.name))
    );
    if (candidates.length !== 1) continue;
    const probability = candidates[0].winningProbability;
    if (!Number.isFinite(probability) || probability <= 0 || probability >= .5) continue;
    results[matchupKey(contest)] = {
      side: winner,
      probability,
      label: 'UPSET',
    };
  }
  return results;
}
