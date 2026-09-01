import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from '../RatedResult';
import {detectHeadToHead} from './HeadToHeadTrigger';

function side(index: number, playerId: string, opponentId: string, outcome: 'W' | 'L' | 'T'): RatedResult {
  const home = playerId === 'p1';
  return {
    id: `c${index}:${playerId}`,
    contestId: `c${index}`,
    matchId: `m${index}`,
    eventId: `round-${index}`,
    seasonId: index <= 1 ? '2025-26' : '2026-27',
    seasonName: index <= 1 ? '2025-2026' : '2026-2027',
    eventLabel: `Round ${index}`,
    format: 'Singles',
    side: home ? 'Home' : 'Away',
    venue: 'Home',
    subjectPlayerIds: [playerId],
    subjectNames: [playerId === 'p1' ? 'Player One' : 'Player Two'],
    teamId: home ? 't1' : 't2',
    teamName: home ? 'Team One' : 'Team Two',
    opponentTeamId: home ? 't2' : 't1',
    opponentTeamName: home ? 'Team Two' : 'Team One',
    outcome,
    won: outcome === 'W',
    actualPoints: outcome === 'W' ? 1 : outcome === 'T' ? .5 : 0,
    expectedPoints: .5,
    winProbability: .5,
    subjectEffectiveCi: 950,
    opponentEffectiveCi: 950,
    ciDeficit: 0,
    ciDelta: 0,
    modelVersion: 'test',
    playedAt: `202${5 + index}-10-03T12:00:00Z`,
  };
}

function meeting(index: number, winner: 'p1' | 'p2' | 'tie'): RatedResult[] {
  if (winner === 'tie') return [side(index, 'p1', 'p2', 'T'), side(index, 'p2', 'p1', 'T')];
  return [
    side(index, 'p1', 'p2', winner === 'p1' ? 'W' : 'L'),
    side(index, 'p2', 'p1', winner === 'p2' ? 'W' : 'L'),
  ];
}

describe('detectHeadToHead', () => {
  it('turns the first rematch into a tied-series story when each player has one win', () => {
    const candidates = detectHeadToHead([...meeting(1, 'p1'), ...meeting(2, 'p2')]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].triggerType, 'HEAD_TO_HEAD');
    assert.equal(candidates[0].eventId, 'round-2');
    assert.equal(candidates[0].headlineFacts.storyKind, 'SERIES_TIED');
    assert.equal(candidates[0].headlineFacts.playerAWins, 1);
    assert.equal(candidates[0].headlineFacts.playerBWins, 1);
    assert.equal(candidates[0].headlineFacts.meetings, 2);
    assert.equal(candidates[0].contextFacts.firstMeetingEvent, 'Round 1');
  });

  it('recognizes a 2-0 series after the first rematch', () => {
    const candidates = detectHeadToHead([...meeting(1, 'p1'), ...meeting(2, 'p1')]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].headlineFacts.storyKind, 'TWO_ZERO');
    assert.equal(candidates[0].headlineFacts.playerAWins, 2);
    assert.equal(candidates[0].headlineFacts.playerBWins, 0);
  });

  it('does not create a rivalry from a first meeting', () => {
    assert.deepEqual(detectHeadToHead(meeting(1, 'p1')), []);
  });

  it('does not replay the first-rematch story after a third meeting exists', () => {
    assert.deepEqual(detectHeadToHead([
      ...meeting(1, 'p1'),
      ...meeting(2, 'p2'),
      ...meeting(3, 'p1'),
    ]), []);
  });
});
