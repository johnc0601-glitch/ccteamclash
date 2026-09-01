import type {RatedResult} from './RatedResult';
import {UPSET_WIN_PROBABILITY_THRESHOLD, upsetRatingEvidence} from './triggers/UpsetTrigger';

export type EligibleUpsetRank = {
  rank: number;
  total: number;
};

/**
 * Historical upset leaderboard used by Pulse. Ghost/provisional probability
 * artifacts are excluded before ranking so they cannot make a real upset look
 * more or less historically significant.
 */
export function eligibleUpsetRank(
  results: RatedResult[],
  resultId: string,
  seasonId?: string,
): EligibleUpsetRank | null {
  const target = results.find((result) => result.id === resultId);
  if (!target?.won || target.winProbability >= UPSET_WIN_PROBABILITY_THRESHOLD) return null;
  if (upsetRatingEvidence(results, target).classification === 'Provisional') return null;

  const eligible = results
    .filter((result) =>
      result.won
      && result.winProbability < UPSET_WIN_PROBABILITY_THRESHOLD
      && (!seasonId || result.seasonId === seasonId)
      && upsetRatingEvidence(results, result).classification !== 'Provisional',
    )
    .sort((a, b) => a.winProbability - b.winProbability || b.ciDeficit - a.ciDeficit || a.id.localeCompare(b.id));
  const index = eligible.findIndex((result) => result.id === resultId);
  return index < 0 ? null : {rank: index + 1, total: eligible.length};
}
