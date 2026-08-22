import {rankingsForScope, type StoryScope} from './StoryScope';
import type {RankedStoryFact, StoryFact} from './StoryRankings';

export type StatsDeskCategory = {
  id: string;
  label: string;
  help: string;
  rows: RankedStoryFact[];
};

/**
 * Commissioner-facing category order. This intentionally contains no editorial
 * suppression: the desk shows the ranked facts and lets a commissioner choose.
 */
export function buildStatsDesk(facts: StoryFact[], scope: StoryScope): StatsDeskCategory[] {
  const rankings = rankingsForScope(facts, scope);
  return [
    {id: 'upsets', label: 'Biggest Upsets', help: 'Wins ranked by lowest pre-match win chance.', rows: rankings.upsetWins},
    {id: 'ci-gaps', label: 'CI Gaps Overcome', help: 'Wins ranked by rating disadvantage overcome.', rows: rankings.ciGapsOvercome},
    {id: 'singles-upsets', label: 'Singles Upsets', help: 'Singles wins ranked by lowest pre-match win chance.', rows: rankings.singlesUpsets},
    {id: 'doubles-upsets', label: 'Doubles Upsets', help: 'Doubles wins using the locked 80/20 pair model.', rows: rankings.doublesUpsets},
    {id: 'road-wins', label: 'Road Wins', help: 'Away wins ranked by lowest pre-match win chance.', rows: rankings.roadWins},
    {id: 'home-wins', label: 'Home Wins', help: 'Home wins ranked by lowest pre-match win chance.', rows: rankings.homeWins},
    {id: 'above-expected', label: 'Above Expectation', help: 'Results that most exceeded the model expectation.', rows: rankings.aboveExpectation},
    {id: 'ci-gains', label: 'Biggest CI Gains', help: 'Largest positive CI changes from a contest.', rows: rankings.positiveCiChanges},
    {id: 'ci-losses', label: 'Biggest CI Losses', help: 'Largest negative CI changes from a contest.', rows: rankings.negativeCiChanges},
    {id: 'favorite-losses', label: 'Favorite Losses', help: 'Losses by players or pairs the model favored.', rows: rankings.favoriteLosses},
    {id: 'closest', label: 'Closest on Paper', help: 'Contests whose pre-match probability was nearest 50/50.', rows: rankings.closestMatchups},
  ];
}

export function defaultStatsDeskScope(eventId: string): StoryScope {
  // Around the Clash opens directly on the current round; commissioners should
  // not have to configure filters before seeing useful results.
  return {kind: 'Round', eventId};
}
