import {buildStoryRankings, type StoryFact, type StoryRankings} from './StoryRankings';

export type StoryScope =
  | {kind: 'Match'; matchId: string}
  | {kind: 'Round'; eventId: string}
  | {kind: 'Season'; seasonId: string}
  | {kind: 'AllTime'};

export function factsForScope(facts: StoryFact[], scope: StoryScope): StoryFact[] {
  switch (scope.kind) {
    case 'Match': return facts.filter((fact) => fact.matchId === scope.matchId);
    case 'Round': return facts.filter((fact) => fact.eventId === scope.eventId);
    case 'Season': return facts.filter((fact) => fact.seasonId === scope.seasonId);
    case 'AllTime': return facts;
  }
}

export function rankingsForScope(facts: StoryFact[], scope: StoryScope): StoryRankings {
  return buildStoryRankings(factsForScope(facts, scope));
}
