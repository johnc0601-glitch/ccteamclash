import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from '../RatedResult';
import {
  detectUpsets,
  ESTABLISHED_RATING_PRIOR_RESULTS,
  upsetMagnitude,
  upsetRatingEvidence,
} from './UpsetTrigger';

function result(overrides: Partial<RatedResult> = {}): RatedResult {
  return {
    id: 'r1', contestId: 'c1', matchId: 'm1', eventId: 'round-1', seasonId: '2026-27',
    format: 'Singles', side: 'Away', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    subjectRatingSeedSources: ['PDGA'],
    teamId: 't1', teamName: 'Cougar Country', opponentTeamId: 't2', opponentTeamName: 'Dark Knights',
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: 0.24, winProbability: 0.24,
    subjectEffectiveCi: 910, opponentEffectiveCi: 980, ciDeficit: 70, ciDelta: 11,
    modelVersion: '2026-27-v1', playedAt: '2026-10-03T12:00:00Z',
    ...overrides,
  };
}

function opponent(overrides: Partial<RatedResult> = {}): RatedResult {
  return result({
    id: 'r1-opponent', side: 'Home', subjectPlayerIds: ['p2'], subjectNames: ['Player Two'],
    subjectRatingSeedSources: ['PDGA'], teamId: 't2', teamName: 'Dark Knights',
    opponentTeamId: 't1', opponentTeamName: 'Cougar Country', outcome: 'L', won: false,
    actualPoints: 0, expectedPoints: 0.76, winProbability: 0.76,
    subjectEffectiveCi: 980, opponentEffectiveCi: 910, ciDeficit: -70, ciDelta: -11,
    ...overrides,
  });
}

function prior(playerId: string, index: number): RatedResult {
  return result({
    id: `prior-${playerId}-${index}`,
    contestId: `prior-contest-${playerId}-${index}`,
    matchId: `prior-match-${playerId}-${index}`,
    eventId: `prior-round-${index}`,
    subjectPlayerIds: [playerId],
    subjectNames: [playerId],
    subjectRatingSeedSources: ['GHOST'],
    playedAt: `2026-0${index + 1}-01T12:00:00Z`,
    winProbability: 0.5,
    expectedPoints: 0.5,
  });
}

describe('UpsetTrigger', () => {
  it('retains a PDGA-backed upset but withholds an exact percentage until CI is established', () => {
    const candidates = detectUpsets([
      result(), opponent(),
      result({id: 'r2', contestId: 'c2', winProbability: 0.40}),
      result({id: 'r3', contestId: 'c3', winProbability: 0.15, won: false, outcome: 'L', actualPoints: 0}),
    ]);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].id, 'upset:r1');
    assert.equal(candidates[0].triggerType, 'UPSET');
    assert.deepEqual(candidates[0].playerIds, ['p1']);
    assert.equal(candidates[0].headlineFacts.winner, 'Player One');
    assert.equal(candidates[0].headlineFacts.winProbability, null);
    assert.equal(candidates[0].headlineFacts.ciDeficit, 70);
    assert.equal(candidates[0].headlineFacts.upsetConfidence, 'Likely');
    assert.equal(candidates[0].headlineFacts.probabilityConfidence, 'Medium');
    assert.equal(candidates[0].contextFacts.modelWinProbability, 0.24);
    assert.equal(candidates[0].contextFacts.ratingEvidence, 'TrustedSeed');
    assert.equal(candidates[0].scores.magnitude, 53.33333333333334);
  });

  it('retains ghost/provisional model upsets for editorial review without a headline probability', () => {
    const winner = result({subjectRatingSeedSources: ['PDGA']});
    const ghostOpponent = opponent({subjectRatingSeedSources: ['GHOST']});
    assert.equal(upsetRatingEvidence([winner, ghostOpponent], winner).classification, 'Provisional');

    const candidate = detectUpsets([winner, ghostOpponent])[0];
    assert.ok(candidate);
    assert.equal(candidate.headlineFacts.upsetConfidence, 'NeedsReview');
    assert.equal(candidate.headlineFacts.probabilityConfidence, 'Low');
    assert.equal(candidate.headlineFacts.winProbability, null);
    assert.equal(candidate.contextFacts.modelWinProbability, 0.24);
    assert.equal(candidate.contextFacts.editorialReviewRequired, true);
    assert.ok(candidate.scores.magnitude <= 35);
  });

  it('treats a player as established after three prior rated contests even from a ghost seed', () => {
    const winner = result({subjectRatingSeedSources: ['GHOST']});
    const losingSide = opponent({subjectRatingSeedSources: ['GHOST']});
    const history = [
      ...Array.from({length: ESTABLISHED_RATING_PRIOR_RESULTS}, (_, index) => prior('p1', index)),
      ...Array.from({length: ESTABLISHED_RATING_PRIOR_RESULTS}, (_, index) => prior('p2', index + 3)),
      winner,
      losingSide,
    ];

    const evidence = upsetRatingEvidence(history, winner);
    assert.equal(evidence.classification, 'Established');
    assert.equal(evidence.subjectPriorRatedResults, 3);
    assert.equal(evidence.opponentPriorRatedResults, 3);
    const candidate = detectUpsets(history)[0];
    assert.ok(candidate);
    assert.equal(candidate.headlineFacts.upsetConfidence, 'ConfirmedByRatings');
    assert.equal(candidate.headlineFacts.probabilityConfidence, 'High');
    assert.equal(candidate.headlineFacts.winProbability, 0.24);
  });

  it('caps extreme probability magnitude while ratings are only trusted seeds', () => {
    const winner = result({winProbability: 0.05, expectedPoints: 0.05});
    const losingSide = opponent({winProbability: 0.95, expectedPoints: 0.95});
    const candidate = detectUpsets([winner, losingSide])[0];
    assert.ok(candidate);
    assert.equal(candidate.contextFacts.ratingEvidence, 'TrustedSeed');
    assert.equal(candidate.headlineFacts.winProbability, null);
    assert.equal(candidate.scores.magnitude, 60);
  });

  it('scales surprise from barely qualifying to maximum at a 10% chance', () => {
    assert.ok(Math.abs(upsetMagnitude(0.39) - 3.333) < 0.01);
    assert.ok(Math.abs(upsetMagnitude(0.25) - 50) < 1e-9);
    assert.equal(upsetMagnitude(0.10), 100);
    assert.equal(upsetMagnitude(0.05), 100);
  });
});
