import type {Match} from '@/domain/schedule/Match';
import type {StoryScope} from './StoryScope';

export type RoundSummary = {
  id: string;
  seasonId: string;
  number: number;
  date: string | null;
};

/**
 * Pick the round a commissioner is most likely opening Around the Clash to review:
 * the latest round that has at least one completed match. If nothing is completed,
 * fall back to the most recent dated round. No setup screen is required.
 */
export function chooseDefaultRound(rounds: RoundSummary[], matches: Match[]): RoundSummary | null {
  if (rounds.length === 0) return null;
  const completedRoundIds = new Set(matches.filter((match) => match.status === 'Completed').map((match) => match.roundId));
  const byRecency = [...rounds].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '') || b.number - a.number,
  );
  return byRecency.find((round) => completedRoundIds.has(round.id)) ?? byRecency[0];
}

export function chooseDefaultStatsScope(rounds: RoundSummary[], matches: Match[]): StoryScope {
  const round = chooseDefaultRound(rounds, matches);
  return round ? {kind: 'Round', eventId: round.id} : {kind: 'AllTime'};
}
