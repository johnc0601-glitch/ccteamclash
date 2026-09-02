import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from '../RatedResult';
import {detectTeamSeries} from './TeamSeriesTrigger';

function side(
  id: string,
  matchId: string,
  contestId: string,
  eventId: string,
  playedAt: string,
  teamId: string,
  teamName: string,
  opponentTeamId: string,
  opponentTeamName: string,
  actualPoints: number,
  overrides: Partial<RatedResult> = {},
): RatedResult {
  const won = actualPoints === 1;
  return {
    id,
    contestId,
    matchId,
    eventId,
    seasonId: 'season-1',
    seasonName: 'Season 1',
    eventLabel: eventId,
    format: 'Singles',
    side: teamId === 'a' ? 'Home' : 'Away',
    subjectPlayerIds: [`${id}-player`],
    subjectNames: [`${id} Player`],
    teamId,
    teamName,
    opponentTeamId,
    opponentTeamName,
    outcome: won ? 'W' : actualPoints === 0.5 ? 'T' : 'L',
    won,
    actualPoints,
    expectedPoints: 0.5,
    winProbability: 0.5,
    subjectEffectiveCi: 950,
    opponentEffectiveCi: 950,
    ciDeficit: 0,
    ciDelta: 0,
    modelVersion: 'test-v1',
    playedAt,
    ...overrides,
  };
}

function meeting(
  number: number,
  scoreA: [number, number],
  scoreB: [number, number],
  overrides: Partial<RatedResult> = {},
): RatedResult[] {
  const matchId = `match-${number}`;
  const eventId = `round-${number}`;
  const playedAt = `2026-1${number}-01T12:00:00Z`;
  return [
    side(`a-${number}-1`, matchId, `${matchId}-c1`, eventId, playedAt, 'a', 'Team A', 'b', 'Team B', scoreA[0], overrides),
    side(`b-${number}-1`, matchId, `${matchId}-c1`, eventId, playedAt, 'b', 'Team B', 'a', 'Team A', scoreB[0], overrides),
    side(`a-${number}-2`, matchId, `${matchId}-c2`, eventId, playedAt, 'a', 'Team A', 'b', 'Team B', scoreA[1], overrides),
    side(`b-${number}-2`, matchId, `${matchId}-c2`, eventId, playedAt, 'b', 'Team B', 'a', 'Team A', scoreB[1], overrides),
  ];
}

describe('detectTeamSeries', () => {
  it('emits the current series state after a rematch and reconstructs team scores once', () => {
    const results = [
      ...meeting(1, [1, 1], [0, 0]),
      ...meeting(2, [0, 0], [1, 1]),
    ];

    const candidates = detectTeamSeries(results);
    assert.equal(candidates.length, 1);
    const candidate = candidates[0];
    assert.equal(candidate.triggerType, 'TEAM_SERIES');
    assert.equal(candidate.matchId, 'match-2');
    assert.equal(candidate.headlineFacts.storyKind, 'SERIES_TIED');
    assert.equal(candidate.headlineFacts.teamAWins, 1);
    assert.equal(candidate.headlineFacts.teamBWins, 1);
    assert.equal(candidate.headlineFacts.meetings, 2);
    assert.equal(candidate.headlineFacts.latestTeamAScore, 0);
    assert.equal(candidate.headlineFacts.latestTeamBScore, 2);
  });

  it('recognizes an unbeaten three-meeting series as more historically significant', () => {
    const results = [
      ...meeting(1, [1, 1], [0, 0]),
      ...meeting(2, [1, 0.5], [0, 0.5]),
      ...meeting(3, [1, 1], [0, 0]),
    ];

    const candidate = detectTeamSeries(results)[0];
    assert.ok(candidate);
    assert.equal(candidate.headlineFacts.storyKind, 'UNBEATEN');
    assert.equal(candidate.headlineFacts.teamAWins, 3);
    assert.equal(candidate.headlineFacts.teamBWins, 0);
    assert.equal(candidate.headlineFacts.meetings, 3);
    assert.ok(candidate.scores.historicalSignificance > 55);
  });

  it('does not aggregate a team match if any surviving result is flagged unreliable', () => {
    const results = [
      ...meeting(1, [1, 1], [0, 0]),
      ...meeting(2, [0, 0], [1, 1], {matchAggregateReliable: false}),
    ];

    assert.deepEqual(detectTeamSeries(results), []);
  });
});
