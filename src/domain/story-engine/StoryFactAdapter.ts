import type {ContestRatingFact} from './ContestRatingFact';
import type {StoryFact} from './StoryRankings';

export type StoryFactContext = {
  eventId: string;
  seasonId: string;
  opponentTeamName: string;
  subjectNames?: string[];
};

/**
 * Converts the immutable analytical record into the neutral shape consumed by
 * Match / Round / Season / All-Time rankings. No editorial filtering happens here.
 */
export function contestRatingFactToStoryFact(
  fact: ContestRatingFact,
  context: StoryFactContext,
): StoryFact {
  return {
    id: `${fact.contestId}:${fact.playerId}`,
    matchId: fact.matchId,
    eventId: context.eventId,
    seasonId: context.seasonId,
    format: fact.format,
    subjectNames: context.subjectNames ?? [fact.playerName],
    teamName: fact.teamName,
    opponentTeamName: context.opponentTeamName,
    side: fact.side,
    winProbability: fact.winProbability,
    ciDeficit: Math.max(0, fact.opponentEffectiveCi - fact.clashIndexBefore),
    ciDelta: fact.ciDelta,
    expectedPoints: fact.expectedPoints,
    actualPoints: fact.actualPoints,
    won: fact.outcome === 'W',
  };
}
