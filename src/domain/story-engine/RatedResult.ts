import type {ResultContestFormat, ResultContestOutcome, ResultContestSide} from '@/domain/results/MatchResult';

/**
 * One normalized player/pair result consumed by every Around the Clash ranking.
 * Matchday storage, historical imports and future rerating should all adapt into
 * this shape instead of teaching each category about database tables.
 */
export type RatedResult = {
  id: string;
  contestId: string;
  matchId: string;
  eventId: string;
  seasonId: string;
  format: ResultContestFormat;
  side: ResultContestSide;
  subjectPlayerIds: string[];
  subjectNames: string[];
  teamId: string;
  teamName: string;
  opponentTeamId: string;
  opponentTeamName: string;
  outcome: ResultContestOutcome;
  won: boolean;
  actualPoints: number;
  expectedPoints: number;
  winProbability: number;
  subjectEffectiveCi: number;
  opponentEffectiveCi: number;
  ciDeficit: number;
  ciDelta: number;
  modelVersion: string;
  playedAt: string;
};

export function outcomePoints(outcome: ResultContestOutcome): number {
  return outcome === 'W' ? 1 : outcome === 'T' ? 0.5 : 0;
}
