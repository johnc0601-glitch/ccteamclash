import {describe, expect, it} from 'vitest';
import {PlayerStatistics} from './PlayerStatistics';
import type {ChallengeResult} from './StatisticsTypes';

const result: ChallengeResult = {
  id: 'match-1-result',
  seasonId: 'season-1',
  challengeId: 'match-1',
  date: '2026-09-12',
  homeTeamId: 'home',
  awayTeamId: 'away',
  homeScore: 12,
  awayScore: 10,
  status: 'Published',
  publishedAt: '2026-09-12T20:00:00Z',
  playerResults: [
    {id: 'singles:p1', contestId: 'singles', playerId: 'p1', playerName: 'Jon', teamId: 'home', format: 'Singles', outcome: 'Loss', pointsEarned: 0, score: 5},
    {id: 'singles:p2', contestId: 'singles', playerId: 'p2', playerName: 'Phil', teamId: 'away', format: 'Singles', outcome: 'Win', pointsEarned: 1, score: 0},
    {id: 'doubles:p1', contestId: 'doubles', playerId: 'p1', playerName: 'Jon', teamId: 'home', format: 'Doubles', outcome: 'Win', pointsEarned: 2},
    {id: 'doubles:p3', contestId: 'doubles', playerId: 'p3', playerName: 'Partner', teamId: 'home', format: 'Doubles', outcome: 'Win', pointsEarned: 2},
    {id: 'doubles:p4', contestId: 'doubles', playerId: 'p4', playerName: 'Opponent A', teamId: 'away', format: 'Doubles', outcome: 'Loss', pointsEarned: 0},
    {id: 'doubles:p5', contestId: 'doubles', playerId: 'p5', playerName: 'Opponent B', teamId: 'away', format: 'Doubles', outcome: 'Loss', pointsEarned: 0},
  ],
};

describe('PlayerStatistics Matchday history', () => {
  it('automatically exposes every published contest for the player', () => {
    const history = new PlayerStatistics().getMatchHistory('p1', [result]);
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      challengeId: 'match-1', format: 'Singles', outcome: 'Loss',
      opponentPlayerNames: ['Phil'], playerScore: 5, opponentScore: 0,
    });
    expect(history[1]).toMatchObject({
      challengeId: 'match-1', format: 'Doubles', outcome: 'Win',
      opponentPlayerNames: ['Opponent A', 'Opponent B'], partnerPlayerNames: ['Partner'],
    });
  });

  it('does not need a second player-history write or table', () => {
    const history = new PlayerStatistics().getMatchHistory('p2', [result]);
    expect(history).toHaveLength(1);
    expect(history[0].opponentPlayerNames).toEqual(['Jon']);
  });
});
