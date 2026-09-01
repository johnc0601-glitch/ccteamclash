import {describe, expect, it} from 'vitest';
import type {StoryCandidateDraft} from './StoryCandidate';
import {calculateStoryScore, finalizeStoryCandidate, storyImportance} from './StoryScoring';

const draft: StoryCandidateDraft = {
  id: 'upset:r1',
  triggerType: 'UPSET',
  seasonId: '2026-27',
  eventId: 'round-1',
  matchId: 'm1',
  playerIds: ['p1'],
  teamIds: ['t1', 't2'],
  headlineFacts: {winProbability: 0.18},
  contextFacts: {},
  scores: {
    magnitude: 90,
    rarity: 80,
    historicalSignificance: 70,
    recency: 100,
    standingsSignificance: 20,
    opponentQuality: 60,
  },
};

describe('StoryScoring', () => {
  it('scores a candidate with trigger-specific weights and marks facts verified', () => {
    const candidate = finalizeStoryCandidate(draft);
    expect(candidate.confidence).toBe('verified');
    expect(candidate.storyScore).toBe(80);
    expect(storyImportance(candidate.storyScore)).toBe('strong');
  });

  it('clamps invalid score components before publishing a final candidate', () => {
    const candidate = finalizeStoryCandidate({
      ...draft,
      scores: {...draft.scores, magnitude: 140, rarity: -25},
    });
    expect(candidate.scores.magnitude).toBe(100);
    expect(candidate.scores.rarity).toBe(0);
  });

  it('normalizes custom weights instead of assuming they sum to one', () => {
    const score = calculateStoryScore(
      {...draft.scores, magnitude: 100, rarity: 0},
      {magnitude: 2, rarity: 2, historicalSignificance: 0, recency: 0, standingsSignificance: 0, opponentQuality: 0},
    );
    expect(score).toBe(50);
  });
});
