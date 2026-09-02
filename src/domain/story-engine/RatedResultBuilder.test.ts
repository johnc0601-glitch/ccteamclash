import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {ResultContest} from '@/domain/results/MatchResult';
import type {ContestRatingFact} from './ContestRatingFact';
import {buildRatedResults} from './RatedResultBuilder';

const contest: ResultContest = {
  id: 'c1', matchId: 'm1', format: 'Singles', position: 1,
  homeOutcome: 'W', awayOutcome: 'L', homeScore: 1, awayScore: 0,
  players: [
    {playerId: 'h1', playerName: 'Home Player', teamId: 'home', teamName: 'Home Team', side: 'Home', slot: 1},
    {playerId: 'a1', playerName: 'Away Player', teamId: 'away', teamName: 'Away Team', side: 'Away', slot: 1},
  ],
  createdAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-01T12:00:00Z',
};

function fact(playerId: string, side: 'Home' | 'Away', probability: number, actual: number, opponentCi: number): ContestRatingFact {
  return {
    contestId: 'c1', matchId: 'm1', playerId, teamId: side === 'Home' ? 'home' : 'away',
    playerName: `${side} Player`, teamName: `${side} Team`, side, venue: 'Home', format: 'Singles',
    outcome: side === 'Home' ? 'W' : 'L', clashIndexBefore: side === 'Home' ? 900 : 1000,
    opponentEffectiveCi: opponentCi, winProbability: probability, actualPoints: actual,
    expectedPoints: probability, performanceVsExpected: actual - probability, ciDelta: side === 'Home' ? 10 : -10,
    algorithmVersion: 'test', calculatedAt: '2026-10-01T13:00:00Z',
  };
}

const context = {
  eventId: 'round-1', seasonId: '2026-27', playedAt: '2026-10-01T12:00:00Z',
  homeTeamId: 'home', homeTeamName: 'Home Team', awayTeamId: 'away', awayTeamName: 'Away Team',
};

describe('buildRatedResults', () => {
  it('produces both sides from one Matchday contest', () => {
    const rows = buildRatedResults(contest, [fact('h1', 'Home', .35, 1, 1000), fact('a1', 'Away', .65, 0, 915)], context);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0].subjectNames, ['Home Player']);
    assert.equal(rows[0].won, true);
    assert.equal(rows[0].winProbability, .35);
    assert.equal(rows[1].won, false);
  });

  it('preserves player-aligned CI snapshots instead of relying on aggregate side movement', () => {
    const rows = buildRatedResults(contest, [fact('h1', 'Home', .35, 1, 1000), fact('a1', 'Away', .65, 0, 915)], context);
    assert.deepEqual({
      subjectPlayerIds: rows[0].subjectPlayerIds,
      subjectCiBefore: rows[0].subjectCiBefore,
      subjectCiAfter: rows[0].subjectCiAfter,
      subjectCiDeltas: rows[0].subjectCiDeltas,
      ciDelta: rows[0].ciDelta,
    }, {
      subjectPlayerIds: ['h1'],
      subjectCiBefore: [900],
      subjectCiAfter: [910],
      subjectCiDeltas: [10],
      ciDelta: 10,
    });
    assert.deepEqual({
      subjectPlayerIds: rows[1].subjectPlayerIds,
      subjectCiBefore: rows[1].subjectCiBefore,
      subjectCiAfter: rows[1].subjectCiAfter,
      subjectCiDeltas: rows[1].subjectCiDeltas,
      ciDelta: rows[1].ciDelta,
    }, {
      subjectPlayerIds: ['a1'],
      subjectCiBefore: [1000],
      subjectCiAfter: [990],
      subjectCiDeltas: [-10],
      ciDelta: -10,
    });
  });

  it('omits a side when its frozen rating fact is missing', () => {
    const rows = buildRatedResults(contest, [fact('h1', 'Home', .35, 1, 1000)], context);
    assert.deepEqual(rows.map((row) => row.side), ['Home']);
  });
});
