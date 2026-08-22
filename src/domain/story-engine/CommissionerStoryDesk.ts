import {buildStatsDesk, type StatsDeskCategory} from './StatsDesk';
import type {StoryFact} from './StoryRankings';
import type {StoryScope} from './StoryScope';

export type CommissionerStorySelection = {
  factId: string;
  categoryId: string;
};

export type CommissionerStoryDesk = {
  scope: StoryScope;
  categories: StatsDeskCategory[];
  selected: CommissionerStorySelection[];
};

/**
 * Pure commissioner workflow state. Rankings remain the source of truth; a
 * selection is only a lightweight reference to a fact/category for later media
 * drafting. Nothing here publishes a post or copies statistical data.
 */
export function buildCommissionerStoryDesk(
  facts: StoryFact[],
  scope: StoryScope,
  selected: CommissionerStorySelection[] = [],
): CommissionerStoryDesk {
  const categories = buildStatsDesk(facts, scope);
  const valid = new Set(categories.flatMap((category) => category.allRows.map((row) => `${category.id}\u0000${row.id}`)));

  return {
    scope,
    categories,
    selected: dedupeSelections(selected).filter((item) => valid.has(`${item.categoryId}\u0000${item.factId}`)),
  };
}

export function toggleStorySelection(
  selected: CommissionerStorySelection[],
  selection: CommissionerStorySelection,
): CommissionerStorySelection[] {
  const exists = selected.some((item) => item.factId === selection.factId && item.categoryId === selection.categoryId);
  if (exists) {
    return selected.filter((item) => !(item.factId === selection.factId && item.categoryId === selection.categoryId));
  }
  return [...dedupeSelections(selected), selection];
}

function dedupeSelections(selected: CommissionerStorySelection[]): CommissionerStorySelection[] {
  const seen = new Set<string>();
  return selected.filter((item) => {
    const key = `${item.categoryId}\u0000${item.factId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
