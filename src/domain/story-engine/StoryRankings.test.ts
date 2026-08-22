import {describe, expect, it} from 'vitest';
import {
  aggregatePlayerExpectation,
  aggregateTeamExpectation,
  buildStoryRankings,
  type StoryFact,
} from './StoryRankings';

const facts: StoryFact[] = [
  {
    id: 'a', matchId: 'm1', eventId: 'r1', seasonId: 's1', format: 'Singles',
    subjectNames: ['Average Joe'], teamName: 'Home Team', opponentTeamName: 'Away Team', side: 'Home',
    winProbability: 0.18, ciDeficit: 105, ciDelta: 12, expectedPoints: 0.18, actualPoints: 1, won: true,
  },
  {
    id: 'b', matchId: 'm1', eventId: 'r1', seasonId: 's1', format: 'Singles',
    subjectNames: ['Phil'], teamName: 'Away Team', opponentTeamName: 'Home Team', side: 'Away',
    winProbability: 0.72, ciDeficit: -70, ciDelta: -9, expectedPoints: 0.72, actualPoints: 0, won: false,
  },
  {
    id: 'c', matchId: 'm2', eventId: 'r1', seasonId: 's1', format: 'Doubles',
    subjectNames: ['Jon', 'Sam'], teamName: 'Away Team', opponentTeamName: 'Third Team', side: 'Away',
    winProbability: 0.27, ciDeficit: 83, ciDelta: 8, expectedPoints: 0.27, actualPoints: 1, won: true,
  },
];

describe('StoryRankings', () => {
  it('ranks the lowest-probability win first', () => {
    const rankings = buildStoryRankings(facts);
    expect(rankings.upsetWins.map((fact) => fact.id)).toEqual(['a', 'c']);
    expect(rankings.singlesUpsets[0].id).toBe('a');
    expect(rankings.doublesUpsets[0].id).toBe('c');
  });

  it('keeps road and home recognition independently rankable', () => {
    const rankings = buildStoryRankings(facts);
    expect(rankings.homeWins.map((fact) => fact.id)).toEqual(['a']);
    expect(rankings.roadWins.map((fact) => fact.id)).toEqual(['c']);
  });

  it('ranks largest CI deficit overcome and CI movement', () => {
    const rankings = buildStoryRankings(facts);
    expect(rankings.ciGapsOvercome[0].id).toBe('a');
    expect(rankings.positiveCiChanges[0].id).toBe('a');
    expect(rankings.negativeCiChanges[0].id).toBe('b');
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
    expect(away?.expectedPoints).toBeCloseTo(0.99);
    expect(away?.actualPoints).toBe(1);
  });
});
