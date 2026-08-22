import type {RatedResult} from './RatedResult';
import type {StoryFact} from './StoryRankings';

/** Keep the ranking engine ignorant of persistence details. */
export function ratedResultToStoryFact(result: RatedResult): StoryFact {
  return {
    id: result.id,
    matchId: result.matchId,
    eventId: result.eventId,
    seasonId: result.seasonId,
    format: result.format,
    subjectNames: result.subjectNames,
    teamName: result.teamName,
    opponentTeamName: result.opponentTeamName,
    side: result.side,
    winProbability: result.winProbability,
    ciDeficit: result.ciDeficit,
    ciDelta: result.ciDelta,
    expectedPoints: result.expectedPoints,
    actualPoints: result.actualPoints,
    won: result.won,
  };
}

export function ratedResultsToStoryFacts(results: RatedResult[]): StoryFact[] {
  return results.map(ratedResultToStoryFact);
}
