import {rankingsForScope, type StoryScope} from './StoryScope';
import type {RankedStoryFact, StoryFact} from './StoryRankings';

export const STATS_DESK_PREVIEW_LIMIT = 5;

export type StatsDeskCategory = {
  id: string;
  label: string;
  help: string;
  /** Top five shown by default. */
  rows: RankedStoryFact[];
  /** Full ranking retained for the category dropdown/expander. */
  allRows: RankedStoryFact[];
  hasMore: boolean;
};

function category(id: string, label: string, help: string, allRows: RankedStoryFact[]): StatsDeskCategory {
  return {
    id,
    label,
    help,
    rows: allRows.slice(0, STATS_DESK_PREVIEW_LIMIT),
    allRows,
    hasMore: allRows.length > STATS_DESK_PREVIEW_LIMIT,
  };
}

/**
 * Commissioner-facing category order. Each category opens with its top five,
 * while the complete ranking remains available from a simple dropdown/expander.
 */
export function buildStatsDesk(facts: StoryFact[], scope: StoryScope): StatsDeskCategory[] {
  const rankings = rankingsForScope(facts, scope);
  return [
    category('upsets', 'Biggest Upsets', 'Wins ranked by lowest pre-match win chance.', rankings.upsetWins),
    category('ci-gaps', 'CI Gaps Overcome', 'Wins ranked by rating disadvantage overcome.', rankings.ciGapsOvercome),
    category('singles-upsets', 'Singles Upsets', 'Singles wins ranked by lowest pre-match win chance.', rankings.singlesUpsets),
    category('doubles-upsets', 'Doubles Upsets', 'Doubles wins using the locked 80/20 pair model.', rankings.doublesUpsets),
    category('road-wins', 'Road Wins', 'Away wins ranked by lowest pre-match win chance.', rankings.roadWins),
    category('home-wins', 'Home Wins', 'Home wins ranked by lowest pre-match win chance.', rankings.homeWins),
    category('above-expected', 'Above Expectation', 'Results that most exceeded the model expectation.', rankings.aboveExpectation),
    category('ci-gains', 'Biggest CI Gains', 'Largest positive CI changes from a contest.', rankings.positiveCiChanges),
    category('ci-losses', 'Biggest CI Losses', 'Largest negative CI changes from a contest.', rankings.negativeCiChanges),
    category('favorite-losses', 'Favorite Losses', 'Losses by players or pairs the model favored.', rankings.favoriteLosses),
    category('closest', 'Closest on Paper', 'Contests whose pre-match probability was nearest 50/50.', rankings.closestMatchups),
  ];
}

export function defaultStatsDeskScope(eventId: string): StoryScope {
  return {kind: 'Round', eventId};
}
