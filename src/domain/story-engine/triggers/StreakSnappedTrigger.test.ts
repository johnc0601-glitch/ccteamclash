import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from '../RatedResult';
import {detectStreaksSnapped} from './StreakSnappedTrigger';

function row(index: number, outcome: RatedResult['outcome']): RatedResult {
  return {
    id: `r${index}`, contestId: `c${index}`, matchId: `m${index}`, eventId: `round-${index}`, seasonId: '2026-27',
    format: 'Singles', side: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
    outcome, won: outcome === 'W', actualPoints: outcome === 'W' ? 1 : outcome === 'T' ? .5 : 0,
    expectedPoints: .5, winProbability: .5, subjectEffectiveCi: 950, opponentEffectiveCi: 950,
    ciDeficit: 0, ciDelta: outcome === 'W' ? 5 : -5, modelVersion: 'test',
    playedAt: `2026-10-0${index}T12:00:00Z`,
  };
}

function breakerRow(index: number, outcome: RatedResult['outcome'] = 'W'): RatedResult {
  return {
    ...row(index, outcome),
    id: `breaker-${index}`,
    side: 'Away',
    subjectPlayerIds: ['p2'],
    subjectNames: ['Breaker Player'],
    teamId: 't2',
    teamName: 'Dark Knights',
    opponentTeamId: 't1',
    opponentTeamName: 'Cougar Country',
    outcome,
    won: outcome === 'W',
    actualPoints: outcome === 'W' ? 1 : outcome === 'T' ? .5 : 0,
  };
}

describe('detectStreaksSnapped', () => {
  it('detects a qualifying streak ending with a loss and names the breaker', () => {
    const candidates = detectStreaksSnapped([
      row(1, 'W'), row(2, 'W'), row(3, 'W'), row(4, 'L'), breakerRow(4, 'W'),
    ]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].triggerType, 'STREAK_SNAPPED');
    assert.equal(candidates[0].eventId, 'round-4');
    assert.equal(candidates[0].headlineFacts.player, 'Player One');
    assert.equal(candidates[0].headlineFacts.format, 'Singles');
    assert.equal(candidates[0].headlineFacts.snappedStreak, 3);
    assert.equal(candidates[0].headlineFacts.breakerOutcome, 'L');
    assert.equal(candidates[0].headlineFacts.breaker, 'Breaker Player');
    assert.equal(candidates[0].headlineFacts.breakerTeam, 'Dark Knights');
  });

  it('treats a tie as ending the streak and preserves the tied opponent', () => {
    const candidates = detectStreaksSnapped([
      row(1, 'W'), row(2, 'W'), row(3, 'W'), row(4, 'T'), breakerRow(4, 'T'),
    ]);
    assert.equal(candidates[0]?.headlineFacts.breakerOutcome, 'T');
    assert.equal(candidates[0]?.headlineFacts.breaker, 'Breaker Player');
  });

  it('ignores a run shorter than the publication candidate threshold', () => {
    assert.deepEqual(detectStreaksSnapped([row(1, 'W'), row(2, 'W'), row(3, 'L')]), []);
  });
});
