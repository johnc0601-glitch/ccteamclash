import {ratedResultsToStoryFacts} from './RatedResultAdapter';
import type {RatedResult} from './RatedResult';
import {buildStatsDesk, type StatsDeskCategory} from './StatsDesk';
import {factsForScope, type StoryScope} from './StoryScope';
import {aggregatePlayerExpectation, aggregateTeamExpectation} from './StoryRankings';

export type StatsDeskView = {
  scope: StoryScope;
  ratedResultCount: number;
  categories: StatsDeskCategory[];
  playerExpectation: ReturnType<typeof aggregatePlayerExpectation>;
  teamExpectation: ReturnType<typeof aggregateTeamExpectation>;
};

/**
 * Single entry point for the commissioner desk. UI code should receive RatedResult[]
 * and never know whether those rows came from Matchday, a historical import, or rerating.
 */
export function buildStatsDeskView(results: RatedResult[], scope: StoryScope): StatsDeskView {
  const allFacts = ratedResultsToStoryFacts(results);
  const scopedFacts = factsForScope(allFacts, scope);
  return {
    scope,
    ratedResultCount: scopedFacts.length,
    categories: buildStatsDesk(allFacts, scope),
    playerExpectation: aggregatePlayerExpectation(scopedFacts),
    teamExpectation: aggregateTeamExpectation(scopedFacts),
  };
}
