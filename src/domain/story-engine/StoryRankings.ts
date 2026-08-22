import type {ClashFormat, ClashSide} from './ClashPrediction';

export type StoryFact = {
  id: string;
  matchId: string;
  eventId: string;
  seasonId: string;
  format: ClashFormat;
  subjectNames: string[];
  teamName: string;
  opponentTeamName: string;
  side: ClashSide;
  winProbability: number;
  ciDeficit: number;
  expectedPoints: number;
  actualPoints: number;
  won: boolean;
};

export type RankedStoryFact = StoryFact & {rank: number};

function rank(facts: StoryFact[], score: (fact: StoryFact) => number): RankedStoryFact[] {
  return [...facts]
    .sort((a, b) => score(b) - score(a))
    .map((fact, index) => ({...fact, rank: index + 1}));
}

export function rankUpsetWins(facts: StoryFact[]): RankedStoryFact[] {
  return rank(facts.filter((fact) => fact.won), (fact) => 1 - fact.winProbability);
}

export function rankCiGapsOvercome(facts: StoryFact[]): RankedStoryFact[] {
  return rank(facts.filter((fact) => fact.won && fact.ciDeficit > 0), (fact) => fact.ciDeficit);
}

export function rankAboveExpectation(facts: StoryFact[]): RankedStoryFact[] {
  return rank(facts, (fact) => fact.actualPoints - fact.expectedPoints);
}

export function rankRoadWins(facts: StoryFact[]): RankedStoryFact[] {
  return rank(facts.filter((fact) => fact.won && fact.side === 'Away'), (fact) => 1 - fact.winProbability);
}

export function rankClosestMatchups(facts: StoryFact[]): RankedStoryFact[] {
  return rank(facts, (fact) => -Math.abs(0.5 - fact.winProbability));
}

export type StoryRankings = {
  upsetWins: RankedStoryFact[];
  ciGapsOvercome: RankedStoryFact[];
  aboveExpectation: RankedStoryFact[];
  roadWins: RankedStoryFact[];
  closestMatchups: RankedStoryFact[];
};

export function buildStoryRankings(facts: StoryFact[]): StoryRankings {
  return {
    upsetWins: rankUpsetWins(facts),
    ciGapsOvercome: rankCiGapsOvercome(facts),
    aboveExpectation: rankAboveExpectation(facts),
    roadWins: rankRoadWins(facts),
    closestMatchups: rankClosestMatchups(facts),
  };
}
