import type {MatchResult, ResultContest} from '@/domain/results/MatchResult';
import type {ClashRatingState, EventRatingResult} from '@/domain/ratings/ClashRatingEngine';
import {calculateEventRatings} from '@/domain/ratings/ClashRatingEngine';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';

export type ClashFinalizationReadiness = {
  ready: boolean;
  eligibleMatchIds: string[];
  publishedMatchIds: string[];
  missingResultMatchIds: string[];
  missingContestMatchIds: string[];
  message: string;
};

export type ClashFinalizedEvent = {
  seasonId: string;
  eventKey: string;
  eventOrder: number;
  eventLabel: string;
  contests: ResultContest[];
  result: EventRatingResult;
};

export function assessClashFinalization(
  round: Round,
  matches: Match[],
  results: MatchResult[],
  contestsByMatch: ReadonlyMap<string, ResultContest[]>,
): ClashFinalizationReadiness {
  const eligibleMatches = matches.filter((match) =>
    match.roundId === round.id && match.status !== 'Cancelled' && match.status !== 'Postponed');
  const resultByMatch = new Map(results.map((result) => [result.matchId, result]));
  const publishedMatchIds = eligibleMatches
    .filter((match) => resultByMatch.get(match.id)?.status === 'Published')
    .map((match) => match.id);
  const missingResultMatchIds = eligibleMatches
    .filter((match) => resultByMatch.get(match.id)?.status !== 'Published')
    .map((match) => match.id);
  const missingContestMatchIds = eligibleMatches
    .filter((match) => {
      const result = resultByMatch.get(match.id);
      return result?.status === 'Published' && !(contestsByMatch.get(match.id)?.length);
    })
    .map((match) => match.id);
  const ready = eligibleMatches.length > 0
    && missingResultMatchIds.length === 0
    && missingContestMatchIds.length === 0;

  return {
    ready,
    eligibleMatchIds: eligibleMatches.map((match) => match.id),
    publishedMatchIds,
    missingResultMatchIds,
    missingContestMatchIds,
    message: ready
      ? `Round ${round.number} is ready to finalize.`
      : readinessMessage(round, eligibleMatches.length, missingResultMatchIds.length, missingContestMatchIds.length),
  };
}

export function finalizeClashEvent(input: {
  round: Round;
  matches: Match[];
  results: MatchResult[];
  contestsByMatch: ReadonlyMap<string, ResultContest[]>;
  states: ClashRatingState[];
}): ClashFinalizedEvent {
  const readiness = assessClashFinalization(
    input.round,
    input.matches,
    input.results,
    input.contestsByMatch,
  );
  if (!readiness.ready) throw new Error(readiness.message);

  const contests = readiness.eligibleMatchIds.flatMap((matchId) => input.contestsByMatch.get(matchId) ?? []);
  const participatingPlayerIds = new Set(contests.flatMap((contest) => contest.players.map((player) => player.playerId)));
  const missingStateIds = [...participatingPlayerIds].filter(
    (playerId) => !input.states.some((state) => state.playerId === playerId),
  );
  if (missingStateIds.length) {
    throw new Error(`Missing Clash rating state for ${missingStateIds.length} player(s): ${missingStateIds.join(', ')}.`);
  }

  return {
    seasonId: input.round.seasonId,
    eventKey: input.round.id,
    eventOrder: input.round.number,
    eventLabel: input.round.name || `Round ${input.round.number}`,
    contests,
    result: calculateEventRatings(contests, input.states),
  };
}

function readinessMessage(
  round: Round,
  eligibleMatches: number,
  missingResults: number,
  missingContests: number,
): string {
  if (!eligibleMatches) return `Round ${round.number} has no eligible matches to rate.`;
  const problems: string[] = [];
  if (missingResults) problems.push(`${missingResults} match result${missingResults === 1 ? '' : 's'} not published`);
  if (missingContests) problems.push(`${missingContests} published match${missingContests === 1 ? '' : 'es'} missing player contests`);
  return `Round ${round.number} cannot be finalized: ${problems.join('; ')}.`;
}
