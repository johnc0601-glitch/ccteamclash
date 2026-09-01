import type {ResultContestFormat, ResultContestOutcome, ResultContestSide} from '@/domain/results/MatchResult';
import type {ClashVenue} from './ClashPrediction';

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
  /** Human-facing context for story copy; canonical filtering still uses IDs. */
  seasonName?: string;
  eventLabel?: string;
  eventOrder?: number;
  format: ResultContestFormat;
  side: ResultContestSide;
  /** Frozen CI venue. Neutral rows must never be interpreted as home/road facts. */
  venue?: ClashVenue;
  subjectPlayerIds: string[];
  subjectNames: string[];
  /**
   * Optional per-player rating snapshots aligned by index with subjectPlayerIds.
   * They are additive so legacy/historical adapters can continue supplying only
   * aggregate side fields until their source data can provide player-level CI.
   */
  subjectCiBefore?: number[];
  subjectCiAfter?: number[];
  subjectCiDeltas?: number[];
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
  /** Aggregate side movement retained for existing Around the Clash rankings. */
  ciDelta: number;
  modelVersion: string;
  playedAt: string;
};

export function outcomePoints(outcome: ResultContestOutcome): number {
  return outcome === 'W' ? 1 : outcome === 'T' ? 0.5 : 0;
}
