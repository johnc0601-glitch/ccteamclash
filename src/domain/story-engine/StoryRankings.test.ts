import {describe, expect, it} from 'vitest';
import {
  aggregatePlayerExpectation,
  aggregateTeamExpectation,
  buildStoryRankings,
  type StoryFact,
} from './StoryRankings';

const facts: StoryFact[] = [
  {id: 'c1:home', matchId: 'm1', eventId: 'r1', seasonId: 's1', format: 'Singles', subjectNames: ['Average Joe'], teamName: 'Home Team', opponentTeamName: 'Away Team', side: 'Home', winProbability: 0.18, ciDeficit: 105, ciDelta: 12, expectedPoints: 0.18, actualPoints: 1, won: true},
  {id: 'c1:away', matchId: 'm1', eventId: 'r1', seasonId: 's1', format: 'Singles', subjectNames: ['Phil'], teamName: 'Away Team', opponentTeamName: 'Home Team', side: 'Away', winProbability: 0.82, ciDeficit: -105, ciDelta: -12, expectedPoints: 0.82, actualPoints: 0, won: false},
  {id: 'c2:away', matchId: 'm2', eventId: 'r1', seasonId: 's1', format: 'Doubles', subjectNames: ['Jon', 'Sam'], teamName: 'Away Team', opponentTeamName: 'Third Team', side: 'Away', winProbability: 0.27, ciDeficit: 83, ciDelta: 8, expectedPoints: 0.27, actualPoints: 1, won: true},
  {id: 'c2:home', matchId: 'm2', eventId: 'r1', seasonId: 's1', format: 'Doubles', subjectNames: ['Pat', 'Lee'], teamName: 'Third Team', opponentTeamName: 'Away Team', side: 'Home', winProbability: 0.73, ciDeficit: -83, ciDelta: -8, expectedPoints: 0.73, actualPoints: 0, won: false},
];

describe('StoryRankings', () => {
  it('ranks every win by lowest pre-match probability', () => {
    const rankings = buildStoryRankings(facts);
    expect(rankings.upsetWins.map((fact) => fact.id)).toEqual(['c1:home', 'c2:away']);
    expect(rankings.singlesUpsets[0].id).toBe('c1:home');
    expect(rankings.doublesUpsets[0].id).toBe('c2:away');
  });

  it('keeps road and home recognition independently rankable', () => {
    const rankings = buildStoryRankings(facts);
    expect(rankings.homeWins.map((fact) => fact.id)).toEqual(['c1:home']);
    expect(rankings.roadWins.map((fact) => fact.id)).toEqual(['c2:away']);
  });

  it('ranks largest CI deficit overcome and CI movement', () => {
    const rankings = buildStoryRankings(facts);
    expect(rankings.ciGapsOvercome[0].id).toBe('c1:home');
    expect(rankings.positiveCiChanges[0].id).toBe('c1:home');
    expect(rankings.negativeCiChanges[0].id).toBe('c1:away');
  });

  it('does not duplicate a contest in Closest on Paper when both sides exist', () => {
    const rows = buildStoryRankings(facts).closestMatchups;
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.id.replace(/:(home|away)$/i, ''))).size).toBe(2);
  });

  it('treats favorite losses as losses only, never ties', () => {
    const tie: StoryFact = {...facts[1], id: 'c3:away', actualPoints: 0.5, expectedPoints: 0.7, winProbability: 0.7, won: false};
    const rows = buildStoryRankings([...facts, tie]).favoriteLosses;
    expect(rows.some((row) => row.id === tie.id)).toBe(false);
    expect(rows.map((row) => row.id)).toEqual(['c1:away', 'c2:home']);
  });

  it('uses CI deficit as a stable tiebreaker for equal win probabilities', () => {
    const tied: StoryFact = {...facts[2], id: 'c4:away', ciDeficit: 90};
    const rows = buildStoryRankings([...facts, tied]).upsetWins.filter((row) => row.winProbability === 0.27);
    expect(rows.map((row) => row.id)).toEqual(['c4:away', 'c2:away']);
  });

  it('aggregates player expected versus actual points without filtering names', () => {
    const rows = aggregatePlayerExpectation(facts);
    expect(rows.find((row) => row.subjectName === 'Average Joe')?.performanceVsExpected).toBeCloseTo(0.82);
    expect(rows.find((row) => row.subjectName === 'Jon')?.performanceVsExpected).toBeCloseTo(0.73);
    expect(rows.find((row) => row.subjectName === 'Sam')?.performanceVsExpected).toBeCloseTo(0.73);
  });

  it('aggregates team expected versus actual points', () => {
    const rows = aggregateTeamExpectation(facts);
    const away = rows.find((row) => row.teamName === 'Away Team');
    expect(away?.expectedPoints).toBeCloseTo(1.09);
    expect(away?.actualPoints).toBe(1);
  });
});
