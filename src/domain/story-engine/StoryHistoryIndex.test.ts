import {describe, expect, it} from 'vitest';
import type {RatedResult} from './RatedResult';
import {StoryHistoryIndex} from './StoryHistoryIndex';

function row(overrides: Partial<RatedResult> & Pick<RatedResult, 'id' | 'contestId' | 'side' | 'subjectPlayerIds' | 'subjectNames' | 'outcome' | 'won' | 'winProbability'>): RatedResult {
  return {
    matchId: `match-${overrides.contestId}`, eventId: 'round-1', seasonId: '2026-27', format: 'Singles',
    teamId: overrides.side === 'Home' ? 'home-team' : 'away-team',
    teamName: overrides.side === 'Home' ? 'Home Team' : 'Away Team',
    opponentTeamId: overrides.side === 'Home' ? 'away-team' : 'home-team',
    opponentTeamName: overrides.side === 'Home' ? 'Away Team' : 'Home Team',
    actualPoints: overrides.outcome === 'W' ? 1 : overrides.outcome === 'T' ? 0.5 : 0,
    expectedPoints: overrides.winProbability,
    subjectEffectiveCi: 950,
    opponentEffectiveCi: 950,
    ciDeficit: 0,
    ciDelta: 0,
    modelVersion: '2026-27-v1',
    playedAt: '2026-10-03T12:00:00Z',
    ...overrides,
  };
}

describe('StoryHistoryIndex', () => {
  it('derives singles head-to-head by joining opposite contest sides', () => {
    const index = new StoryHistoryIndex([
      row({id: 'c1:home', contestId: 'c1', side: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['One'], outcome: 'W', won: true, winProbability: 0.45, playedAt: '2026-10-03T12:00:00Z'}),
      row({id: 'c1:away', contestId: 'c1', side: 'Away', subjectPlayerIds: ['p2'], subjectNames: ['Two'], outcome: 'L', won: false, winProbability: 0.55, playedAt: '2026-10-03T12:00:00Z'}),
      row({id: 'c2:home', contestId: 'c2', side: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['One'], outcome: 'T', won: false, winProbability: 0.50, playedAt: '2026-11-03T12:00:00Z'}),
      row({id: 'c2:away', contestId: 'c2', side: 'Away', subjectPlayerIds: ['p2'], subjectNames: ['Two'], outcome: 'T', won: false, winProbability: 0.50, playedAt: '2026-11-03T12:00:00Z'}),
    ]);

    expect(index.playerHeadToHead('p1', 'p2')).toEqual({
      playerAId: 'p1', playerBId: 'p2', meetings: 2, playerAWins: 1, playerBWins: 0, ties: 1,
      lastMeetingAt: '2026-11-03T12:00:00Z',
    });
  });

  it('keeps singles as the default head-to-head format when a season scope is supplied', () => {
    const index = new StoryHistoryIndex([
      row({id: 's1:home', contestId: 's1', side: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['One'], outcome: 'W', won: true, winProbability: 0.45}),
      row({id: 's1:away', contestId: 's1', side: 'Away', subjectPlayerIds: ['p2'], subjectNames: ['Two'], outcome: 'L', won: false, winProbability: 0.55}),
      row({id: 'd1:home', contestId: 'd1', side: 'Home', format: 'Doubles', subjectPlayerIds: ['p1', 'p3'], subjectNames: ['One', 'Three'], outcome: 'W', won: true, winProbability: 0.45}),
      row({id: 'd1:away', contestId: 'd1', side: 'Away', format: 'Doubles', subjectPlayerIds: ['p2', 'p4'], subjectNames: ['Two', 'Four'], outcome: 'L', won: false, winProbability: 0.55}),
    ]);
    expect(index.playerHeadToHead('p1', 'p2', {seasonId: '2026-27'}).meetings).toBe(1);
  });

  it('aggregates order-independent doubles chemistry and performance versus expectation', () => {
    const results: RatedResult[] = [
      row({id: 'd1:home', contestId: 'd1', side: 'Home', format: 'Doubles', subjectPlayerIds: ['p3', 'p1'], subjectNames: ['Three', 'One'], outcome: 'W', won: true, winProbability: 0.40, expectedPoints: 0.40}),
      row({id: 'd2:home', contestId: 'd2', side: 'Home', format: 'Doubles', subjectPlayerIds: ['p1', 'p3'], subjectNames: ['One', 'Three'], outcome: 'L', won: false, winProbability: 0.60, expectedPoints: 0.60}),
    ];
    const record = new StoryHistoryIndex(results).doublesPairRecord('p3', 'p1');
    expect(record).toMatchObject({playerIds: ['p1', 'p3'], contests: 2, wins: 1, losses: 1, ties: 0});
    expect(record.expectedPoints).toBe(1);
    expect(record.actualPoints).toBe(1);
    expect(record.performanceVsExpected).toBe(0);
  });

  it('ranks only qualifying upset wins by lowest pre-match win probability', () => {
    const index = new StoryHistoryIndex([
      row({id: 'u1', contestId: 'u1', side: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['One'], outcome: 'W', won: true, winProbability: 0.22}),
      row({id: 'u2', contestId: 'u2', side: 'Home', subjectPlayerIds: ['p2'], subjectNames: ['Two'], outcome: 'W', won: true, winProbability: 0.09}),
      row({id: 'f1', contestId: 'f1', side: 'Home', subjectPlayerIds: ['p3'], subjectNames: ['Three'], outcome: 'W', won: true, winProbability: 0.70}),
    ]);
    expect(index.upsetRank('u2', {seasonId: '2026-27'})).toEqual({rank: 1, total: 2});
    expect(index.upsetRank('u1', {seasonId: '2026-27'})).toEqual({rank: 2, total: 2});
    expect(index.upsetRank('f1', {seasonId: '2026-27'})).toBeNull();
  });
});
