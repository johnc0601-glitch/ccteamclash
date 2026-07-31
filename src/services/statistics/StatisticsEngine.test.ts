import {StatisticsEngine} from '@/services/statistics/StatisticsEngine';
import type {StatisticsRepository} from '@/services/statistics/StatisticsRepository';
import type {ChallengeResult} from '@/services/statistics/StatisticsTypes';
import assert from 'node:assert/strict';
import test from 'node:test';

const TEST_RESULTS: ChallengeResult[] = [
  {
    id: 'test-1',
    seasonId: 'season-1',
    challengeId: 'challenge-1',
    date: '2026-07-01',
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    homeScore: 20,
    awayScore: 16,
    status: 'Published',
    publishedAt: '2026-07-01T18:00:00.000Z',
    playerResults: [
      {
        id: 'player-1-singles',
        contestId: 'row-1',
        playerId: 'player-1',
        playerName: 'Player One',
        teamId: 'team-a',
        format: 'Singles',
        outcome: 'Win',
        pointsEarned: 1,
        score: 7,
      },
      {
        id: 'player-2-singles',
        contestId: 'row-1',
        playerId: 'player-2',
        playerName: 'Player Two',
        teamId: 'team-b',
        format: 'Singles',
        outcome: 'Loss',
        pointsEarned: 0,
        score: 4,
      },
      {
        id: 'player-1-doubles',
        contestId: 'row-2',
        playerId: 'player-1',
        playerName: 'Player One',
        teamId: 'team-a',
        format: 'Doubles',
        outcome: 'Tie',
        pointsEarned: 1,
      },
      {
        id: 'partner-doubles',
        contestId: 'row-2',
        playerId: 'partner',
        playerName: 'Partner Name',
        teamId: 'team-a',
        format: 'Doubles',
        outcome: 'Tie',
        pointsEarned: 1,
      },
      {
        id: 'opponent-1-doubles',
        contestId: 'row-2',
        playerId: 'opponent-1',
        playerName: 'Opponent One',
        teamId: 'team-b',
        format: 'Doubles',
        outcome: 'Tie',
        pointsEarned: 1,
      },
      {
        id: 'opponent-2-doubles',
        contestId: 'row-2',
        playerId: 'opponent-2',
        playerName: 'Opponent Two',
        teamId: 'team-b',
        format: 'Doubles',
        outcome: 'Tie',
        pointsEarned: 1,
      },
    ],
  },
];

class TestStatisticsRepository implements StatisticsRepository {
  async getPublishedChallengeResults(): Promise<ChallengeResult[]> {
    return TEST_RESULTS;
  }
}

test('StatisticsEngine calculates team, player, season, and head-to-head stats', async () => {
  const engine = new StatisticsEngine(new TestStatisticsRepository());
  const teamStats = await engine.getTeamStatistics('team-a', 'season-1');
  assert.equal(teamStats.record.wins, 1);
  assert.equal(teamStats.pointsPercentage, 55.6);

  const playerStats = await engine.getPlayerStatistics('player-1', 'season-1');
  assert.equal(playerStats.singlesRecord.wins, 1);
  assert.equal(playerStats.doublesRecord.ties, 1);
  assert.equal(playerStats.matchesPlayed, 1);
  assert.equal(playerStats.finalsQualified, false);

  const seasonStats = await engine.getSeasonStatistics('season-1');
  assert.equal(seasonStats.challengesPlayed, 1);

  const headToHead = await engine.getHeadToHead('team-a', 'team-b', 'season-1');
  assert.equal(headToHead.recordForTeamA.wins, 1);
});

test('Player season match tally counts challenges, not singles and doubles entries', async () => {
  const secondResult: ChallengeResult = {
    ...TEST_RESULTS[0],
    id: 'test-2',
    challengeId: 'challenge-2',
    date: '2026-07-15',
    playerResults: [{
      id: 'player-1-second-match',
      playerId: 'player-1',
      playerName: 'Player One',
      teamId: 'team-a',
      format: 'Singles',
      outcome: 'Loss',
      pointsEarned: 0,
    }],
  };
  const engine = new StatisticsEngine({
    async getPublishedChallengeResults() {
      return [...TEST_RESULTS, secondResult];
    },
  });

  const playerStats = await engine.getPlayerStatistics('player-1', 'season-1');

  assert.equal(playerStats.matchesPlayed, 2);
  assert.equal(playerStats.finalsQualified, true);
});

test('Player career totals and match history include published results across seasons', async () => {
  const careerResult: ChallengeResult = {
    ...TEST_RESULTS[0],
    id: 'test-career-2',
    seasonId: 'season-2',
    challengeId: 'challenge-career-2',
    date: '2027-07-01',
    homeTeamId: 'team-c',
    awayTeamId: 'team-a',
    playerResults: [{
      id: 'player-1-career-result',
      contestId: 'career-row',
      playerId: 'player-1',
      playerName: 'Player One',
      teamId: 'team-a',
      format: 'Singles',
      outcome: 'Loss',
      pointsEarned: 0,
      score: 3,
    }, {
      id: 'player-3-career-result',
      contestId: 'career-row',
      playerId: 'player-3',
      playerName: 'Player Three',
      teamId: 'team-c',
      format: 'Singles',
      outcome: 'Win',
      pointsEarned: 1,
      score: 6,
    }],
  };
  const engine = new StatisticsEngine({
    async getPublishedChallengeResults() {
      return [...TEST_RESULTS, careerResult];
    },
  });

  const career = await engine.getPlayerCareerStatistics('player-1');
  const history = await engine.getPlayerMatchHistory('player-1');

  assert.equal(career.matchesPlayed, 2);
  assert.equal(career.overallRecord.wins, 1);
  assert.equal(career.overallRecord.losses, 1);
  assert.equal(history.length, 3);
  assert.equal(history[0].opponentTeamId, 'team-c');
  assert.equal(history[0].isHome, false);
  assert.equal(history[1].playerScore, 7);
  assert.equal(history[1].opponentScore, 4);
  assert.deepEqual(history[2].partnerPlayerNames, ['Partner Name']);
  assert.deepEqual(history[2].opponentPlayerNames, ['Opponent One', 'Opponent Two']);
});

test('player history is newest first, excludes incomplete rows, and limits cards to three', async () => {
  const results: ChallengeResult[] = Array.from({length: 5}, (_, index) => ({
    ...TEST_RESULTS[0],
    id: `ordered-${index}`,
    challengeId: `ordered-${index}`,
    date: `2026-07-0${index + 1}`,
    playerResults: index === 4 ? [{
      ...TEST_RESULTS[0].playerResults[0],
      id: 'incomplete-player',
      contestId: 'incomplete',
    }] : TEST_RESULTS[0].playerResults.filter((entry) => entry.contestId === 'row-1')
      .map((entry) => ({...entry, id: `${entry.id}-${index}`, contestId: `row-${index}`})),
  }));
  const engine = new StatisticsEngine({async getPublishedChallengeResults() { return results; }});

  const latest = await engine.getPlayerMatchHistory('player-1', 3);

  assert.equal(latest.length, 3);
  assert.deepEqual(latest.map((entry) => entry.date), ['2026-07-04', '2026-07-03', '2026-07-02']);
});

test('current-season player history excludes other seasons before applying the three-match limit', async () => {
  const currentSeasonResults: ChallengeResult[] = Array.from({length: 4}, (_, index) => ({
    ...TEST_RESULTS[0],
    id: `current-${index}`,
    challengeId: `current-${index}`,
    date: `2026-08-0${index + 1}`,
    playerResults: TEST_RESULTS[0].playerResults.filter((entry) => entry.contestId === 'row-1')
      .map((entry) => ({...entry, id: `${entry.id}-current-${index}`, contestId: `current-row-${index}`})),
  }));
  const priorSeasonResult: ChallengeResult = {
    ...currentSeasonResults[3],
    id: 'prior-season',
    seasonId: 'season-0',
    challengeId: 'prior-season',
    date: '2027-09-01',
  };
  const engine = new StatisticsEngine({
    async getPublishedChallengeResults() { return [...currentSeasonResults, priorSeasonResult]; },
  });

  const histories = await engine.getPlayerMatchHistoriesForPlayers(['player-1'], 3, 'season-1');
  const history = histories.get('player-1') ?? [];

  assert.equal(history.length, 3);
  assert.deepEqual(history.map((entry) => entry.seasonId), ['season-1', 'season-1', 'season-1']);
  assert.deepEqual(history.map((entry) => entry.date), ['2026-08-04', '2026-08-03', '2026-08-02']);
});

test('complete player history remains cross-season and newest first', async () => {
  const older = {...TEST_RESULTS[0], date: '2025-06-01', seasonId: 'season-0'};
  const newer = {
    ...TEST_RESULTS[0],
    id: 'newer-result',
    challengeId: 'newer-result',
    date: '2027-06-01',
    seasonId: 'season-2',
  };
  const engine = new StatisticsEngine({
    async getPublishedChallengeResults() { return [TEST_RESULTS[0], older, newer]; },
  });

  const history = await engine.getPlayerMatchHistory('player-1');

  assert.deepEqual(
    [...new Set(history.map((entry) => entry.seasonId))],
    ['season-2', 'season-1', 'season-0'],
  );
  assert.deepEqual(history.map((entry) => entry.date), [...history.map((entry) => entry.date)].sort().reverse());
});

test('player history retains the team membership recorded for that season', async () => {
  const movedPlayer = {...TEST_RESULTS[0], playerResults: TEST_RESULTS[0].playerResults.map((entry) =>
    entry.playerId === 'player-1' ? {...entry, teamId: 'historical-team'} : entry),
    homeTeamId: 'historical-team'};
  const engine = new StatisticsEngine({async getPublishedChallengeResults() { return [movedPlayer]; }});

  const [entry] = await engine.getPlayerMatchHistory('player-1');

  assert.equal(entry.teamId, 'historical-team');
  assert.equal(entry.isHome, true);
});
