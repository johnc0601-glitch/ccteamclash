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
  ciDelta: number;
  expectedPoints: number;
  actualPoints: number;
  won: boolean;
};

export type RankedStoryFact = StoryFact & {rank: number};

function rank(facts: StoryFact[], score: (fact: StoryFact) => number): RankedStoryFact[] {
  return [...facts]
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
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

export function rankHomeWins(facts: StoryFact[]): RankedStoryFact[] {
  return rank(facts.filter((fact) => fact.won && fact.side === 'Home'), (fact) => 1 - fact.winProbability);
}

export function rankSinglesUpsets(facts: StoryFact[]): RankedStoryFact[] {
  return rankUpsetWins(facts.filter((fact) => fact.format === 'Singles'));
}

export function rankDoublesUpsets(facts: StoryFact[]): RankedStoryFact[] {
  return rankUpsetWins(facts.filter((fact) => fact.format === 'Doubles'));
}

export function rankClosestMatchups(facts: StoryFact[]): RankedStoryFact[] {
  return rank(facts, (fact) => -Math.abs(0.5 - fact.winProbability));
}

export function rankPositiveCiChanges(facts: StoryFact[]): RankedStoryFact[] {
  return rank(facts.filter((fact) => fact.ciDelta > 0), (fact) => fact.ciDelta);
}

export function rankNegativeCiChanges(facts: StoryFact[]): RankedStoryFact[] {
  return rank(facts.filter((fact) => fact.ciDelta < 0), (fact) => -fact.ciDelta);
}

export function rankFavoriteLosses(facts: StoryFact[]): RankedStoryFact[] {
  return rank(facts.filter((fact) => !fact.won && fact.winProbability > 0.5), (fact) => fact.winProbability);
}

export type PlayerExpectation = {
  subjectName: string;
  teamName: string;
  contests: number;
  expectedPoints: number;
  actualPoints: number;
  performanceVsExpected: number;
};

export function aggregatePlayerExpectation(facts: StoryFact[]): PlayerExpectation[] {
  const players = new Map<string, PlayerExpectation>();
  for (const fact of facts) {
    for (const subjectName of fact.subjectNames) {
      const key = `${fact.teamName}\u0000${subjectName}`;
      const current = players.get(key) ?? {
        subjectName,
        teamName: fact.teamName,
        contests: 0,
        expectedPoints: 0,
        actualPoints: 0,
        performanceVsExpected: 0,
      };
      current.contests += 1;
      current.expectedPoints += fact.expectedPoints;
      current.actualPoints += fact.actualPoints;
      current.performanceVsExpected = current.actualPoints - current.expectedPoints;
      players.set(key, current);
    }
  }
  return [...players.values()].sort((a, b) =>
    b.performanceVsExpected - a.performanceVsExpected || a.subjectName.localeCompare(b.subjectName));
}

export type TeamExpectation = {
  teamName: string;
  expectedPoints: number;
  actualPoints: number;
  performanceVsExpected: number;
};

export function aggregateTeamExpectation(facts: StoryFact[]): TeamExpectation[] {
  const teams = new Map<string, TeamExpectation>();
  for (const fact of facts) {
    const current = teams.get(fact.teamName) ?? {
      teamName: fact.teamName,
      expectedPoints: 0,
      actualPoints: 0,
      performanceVsExpected: 0,
    };
    current.expectedPoints += fact.expectedPoints;
    current.actualPoints += fact.actualPoints;
    current.performanceVsExpected = current.actualPoints - current.expectedPoints;
    teams.set(fact.teamName, current);
  }
  return [...teams.values()].sort((a, b) =>
    b.performanceVsExpected - a.performanceVsExpected || a.teamName.localeCompare(b.teamName));
}

export type StoryRankings = {
  upsetWins: RankedStoryFact[];
  ciGapsOvercome: RankedStoryFact[];
  aboveExpectation: RankedStoryFact[];
  roadWins: RankedStoryFact[];
  homeWins: RankedStoryFact[];
  singlesUpsets: RankedStoryFact[];
  doublesUpsets: RankedStoryFact[];
  closestMatchups: RankedStoryFact[];
  positiveCiChanges: RankedStoryFact[];
  negativeCiChanges: RankedStoryFact[];
  favoriteLosses: RankedStoryFact[];
  playerExpectation: PlayerExpectation[];
  teamExpectation: TeamExpectation[];
};

export function buildStoryRankings(facts: StoryFact[]): StoryRankings {
  return {
    upsetWins: rankUpsetWins(facts),
    ciGapsOvercome: rankCiGapsOvercome(facts),
    aboveExpectation: rankAboveExpectation(facts),
    roadWins: rankRoadWins(facts),
    homeWins: rankHomeWins(facts),
    singlesUpsets: rankSinglesUpsets(facts),
    doublesUpsets: rankDoublesUpsets(facts),
    closestMatchups: rankClosestMatchups(facts),
    positiveCiChanges: rankPositiveCiChanges(facts),
    negativeCiChanges: rankNegativeCiChanges(facts),
    favoriteLosses: rankFavoriteLosses(facts),
    playerExpectation: aggregatePlayerExpectation(facts),
    teamExpectation: aggregateTeamExpectation(facts),
  };
}
