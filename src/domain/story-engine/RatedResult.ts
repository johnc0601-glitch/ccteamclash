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
   * Optional per-player frozen CI and contest contributions aligned by index
   * with subjectPlayerIds. subjectCiAfter is contribution-level convenience,
   * not the authoritative published post-Matchday CI when a player has multiple
   * contests; StoryHistoryIndex aggregates all Matchday deltas before using CI.
   */
  subjectCiBefore?: number[];
  subjectCiAfter?: number[];
  subjectCiDeltas?: number[];
  /**
   * Optional per-player source used to seed the rating entering this season.
   * Historical adapters currently expose PDGA/GHOST/UNKNOWN. Pulse uses this
   * only as confidence metadata; it never changes the authoritative CI itself.
   */
  subjectRatingSeedSources?: string[];
  /**
   * False means this normalized contest is safe for non-CI stories, but at least
   * one subject player's complete Matchday CI chain is known to be incomplete.
   */
  ciHistoryReliable?: boolean;
  /**
   * False means at least one contest from this team match was quarantined, so
   * surviving contest facts must not be summed into a team-match score/series.
   */
  matchAggregateReliable?: boolean;
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
