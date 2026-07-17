import type {ChallengeResult, RecordSummary} from '@/services/statistics/StatisticsTypes';

export function emptyRecord(): RecordSummary {
  return {wins: 0, losses: 0, ties: 0};
}

export function recordOutcome(record: RecordSummary, outcome: 'Win' | 'Loss' | 'Tie'): void {
  if (outcome === 'Win') record.wins += 1;
  if (outcome === 'Loss') record.losses += 1;
  if (outcome === 'Tie') record.ties += 1;
}

export function getWinPercentage(record: RecordSummary): number {
  const decisions = record.wins + record.losses + record.ties;
  if (!decisions) return 0;
  return roundPercentage(((record.wins + record.ties * 0.5) / decisions) * 100);
}

export function roundPercentage(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getTeamOutcome(result: ChallengeResult, teamId: string): 'Win' | 'Loss' | 'Tie' {
  const isHome = result.homeTeamId === teamId;
  const teamScore = isHome ? result.homeScore : result.awayScore;
  const opponentScore = isHome ? result.awayScore : result.homeScore;
  if (teamScore > opponentScore) return 'Win';
  if (teamScore < opponentScore) return 'Loss';
  return 'Tie';
}

export function getStreak(outcomes: string[]): string {
  if (!outcomes.length) return '--';

  const latestOutcome = outcomes[outcomes.length - 1];
  let count = 0;
  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    if (outcomes[index] !== latestOutcome) break;
    count += 1;
  }
  return `${latestOutcome}${count}`;
}

export function sortByDate(results: ChallengeResult[]): ChallengeResult[] {
  return [...results].sort((left, right) =>
    left.date.localeCompare(right.date) || left.id.localeCompare(right.id),
  );
}
