import {buildStoryRankings, type StoryFact, type StoryRankings} from './StoryRankings';

export type StoryScope = 'Match' | 'Round' | 'Season' | 'AllTime';

export type StoryScopeContext = {
  matchId?: string;
  eventId?: string;
  seasonId?: string;
};

export function factsForScope(
  facts: StoryFact[],
  scope: StoryScope,
  context: StoryScopeContext,
): StoryFact[] {
  switch (scope) {
    case 'Match':
      return facts.filter((fact) => fact.matchId === context.matchId);
    case 'Round':
      return facts.filter((fact) => fact.eventId === context.eventId);
    case 'Season':
      return facts.filter((fact) => fact.seasonId === context.seasonId);
    case 'AllTime':
      return facts;
  }
}

export function buildScopedStoryRankings(
  facts: StoryFact[],
  scope: StoryScope,
  context: StoryScopeContext = {},
): StoryRankings {
  return buildStoryRankings(factsForScope(facts, scope, context));
}
