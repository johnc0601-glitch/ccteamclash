import type {StoryCandidate, StoryCandidateDraft, StoryScoreComponents, StoryTriggerType} from './StoryCandidate';

export type StoryScoreWeights = StoryScoreComponents;

const DEFAULT_WEIGHTS: StoryScoreWeights = {
  magnitude: 0.30,
  rarity: 0.30,
  historicalSignificance: 0.20,
  recency: 0.05,
  standingsSignificance: 0.10,
  opponentQuality: 0.05,
};

const TRIGGER_WEIGHTS: Partial<Record<StoryTriggerType, StoryScoreWeights>> = {
  UPSET: {
    magnitude: 0.45,
    rarity: 0.25,
    historicalSignificance: 0.15,
    recency: 0.05,
    standingsSignificance: 0.05,
    opponentQuality: 0.05,
  },
  WIN_STREAK: {
    magnitude: 0.35,
    rarity: 0.30,
    historicalSignificance: 0.20,
    recency: 0.05,
    standingsSignificance: 0.05,
    opponentQuality: 0.05,
  },
  STREAK_SNAPPED: {
    magnitude: 0.40,
    rarity: 0.25,
    historicalSignificance: 0.20,
    recency: 0.05,
    standingsSignificance: 0.05,
    opponentQuality: 0.05,
  },
  CI_SURGE: {
    magnitude: 0.40,
    rarity: 0.30,
    historicalSignificance: 0.15,
    recency: 0.05,
    standingsSignificance: 0.05,
    opponentQuality: 0.05,
  },
  PERSONAL_BEST: {
    magnitude: 0.35,
    rarity: 0.20,
    historicalSignificance: 0.30,
    recency: 0.05,
    standingsSignificance: 0.05,
    opponentQuality: 0.05,
  },
  DOUBLES_CHEMISTRY: {
    magnitude: 0.30,
    rarity: 0.30,
    historicalSignificance: 0.25,
    recency: 0.05,
    standingsSignificance: 0.05,
    opponentQuality: 0.05,
  },
  HEAD_TO_HEAD: {
    magnitude: 0.30,
    rarity: 0.30,
    historicalSignificance: 0.25,
    recency: 0.05,
    standingsSignificance: 0.05,
    opponentQuality: 0.05,
  },
  TEAM_SERIES: {
    magnitude: 0.30,
    rarity: 0.25,
    historicalSignificance: 0.30,
    recency: 0.05,
    standingsSignificance: 0.05,
    opponentQuality: 0.05,
  },
  RECORD: {
    magnitude: 0.20,
    rarity: 0.25,
    historicalSignificance: 0.40,
    recency: 0.05,
    standingsSignificance: 0.05,
    opponentQuality: 0.05,
  },
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function normalizedWeights(weights: StoryScoreWeights): StoryScoreWeights {
  const total = Object.values(weights).reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) return DEFAULT_WEIGHTS;
  return {
    magnitude: Math.max(0, weights.magnitude) / total,
    rarity: Math.max(0, weights.rarity) / total,
    historicalSignificance: Math.max(0, weights.historicalSignificance) / total,
    recency: Math.max(0, weights.recency) / total,
    standingsSignificance: Math.max(0, weights.standingsSignificance) / total,
    opponentQuality: Math.max(0, weights.opponentQuality) / total,
  };
}

export function weightsForTrigger(triggerType: StoryTriggerType): StoryScoreWeights {
  return TRIGGER_WEIGHTS[triggerType] ?? DEFAULT_WEIGHTS;
}

export function calculateStoryScore(
  scores: StoryScoreComponents,
  weights: StoryScoreWeights = DEFAULT_WEIGHTS,
): number {
  const normalized = normalizedWeights(weights);
  const weighted =
    clampScore(scores.magnitude) * normalized.magnitude
    + clampScore(scores.rarity) * normalized.rarity
    + clampScore(scores.historicalSignificance) * normalized.historicalSignificance
    + clampScore(scores.recency) * normalized.recency
    + clampScore(scores.standingsSignificance) * normalized.standingsSignificance
    + clampScore(scores.opponentQuality) * normalized.opponentQuality;
  return Math.round(weighted * 10) / 10;
}

export function finalizeStoryCandidate(draft: StoryCandidateDraft): StoryCandidate {
  return {
    ...draft,
    scores: {
      magnitude: clampScore(draft.scores.magnitude),
      rarity: clampScore(draft.scores.rarity),
      historicalSignificance: clampScore(draft.scores.historicalSignificance),
      recency: clampScore(draft.scores.recency),
      standingsSignificance: clampScore(draft.scores.standingsSignificance),
      opponentQuality: clampScore(draft.scores.opponentQuality),
    },
    storyScore: calculateStoryScore(draft.scores, weightsForTrigger(draft.triggerType)),
    confidence: 'verified',
  };
}

export type StoryImportance = 'candidate' | 'notable' | 'strong' | 'major';

export function storyImportance(score: number): StoryImportance {
  if (score >= 85) return 'major';
  if (score >= 70) return 'strong';
  if (score >= 55) return 'notable';
  return 'candidate';
}
