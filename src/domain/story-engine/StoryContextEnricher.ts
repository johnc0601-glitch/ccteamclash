import type {StoryCandidateDraft} from './StoryCandidate';
import type {RankedOccurrence} from './StoryHistoryIndex';
import {StoryHistoryIndex} from './StoryHistoryIndex';

function rarityFromRank(rank: RankedOccurrence): number {
  if (rank.total <= 1) return 100;
  return Math.max(0, Math.min(100, 100 - ((rank.rank - 1) / rank.total) * 100));
}

function historicalSignificanceFromRank(rank: RankedOccurrence): number {
  if (rank.rank === 1) return 100;
  if (rank.rank <= 3) return 90;
  if (rank.rank <= 10) return 75;
  return 50;
}

function enrichUpset(draft: StoryCandidateDraft, history: StoryHistoryIndex): StoryCandidateDraft {
  const resultId = draft.headlineFacts.resultId;
  if (typeof resultId !== 'string') return draft;

  const seasonRank = history.upsetRank(resultId, {seasonId: draft.seasonId});
  const allTimeRank = history.upsetRank(resultId);
  if (!seasonRank && !allTimeRank) return draft;

  return {
    ...draft,
    contextFacts: {
      ...draft.contextFacts,
      seasonUpsetRank: seasonRank?.rank ?? null,
      seasonUpsetTotal: seasonRank?.total ?? null,
      allTimeUpsetRank: allTimeRank?.rank ?? null,
      allTimeUpsetTotal: allTimeRank?.total ?? null,
    },
    scores: {
      ...draft.scores,
      rarity: allTimeRank ? rarityFromRank(allTimeRank) : draft.scores.rarity,
      historicalSignificance: allTimeRank
        ? historicalSignificanceFromRank(allTimeRank)
        : draft.scores.historicalSignificance,
    },
  };
}

function enrichCiSurge(draft: StoryCandidateDraft, history: StoryHistoryIndex): StoryCandidateDraft {
  const playerId = draft.playerIds[0];
  const matchdays = draft.headlineFacts.matchdays;
  if (!playerId || typeof matchdays !== 'number') return draft;

  const seasonRank = history.ciWindowRank(playerId, matchdays, {seasonId: draft.seasonId});
  if (!seasonRank) return draft;

  return {
    ...draft,
    contextFacts: {
      ...draft.contextFacts,
      seasonCiGainRank: seasonRank.rank,
      seasonCiGainComparisonPlayers: seasonRank.total,
    },
    scores: {
      ...draft.scores,
      rarity: rarityFromRank(seasonRank),
      historicalSignificance: seasonRank.rank === 1
        ? 80
        : seasonRank.rank <= 3 ? 65 : draft.scores.historicalSignificance,
    },
  };
}

/**
 * Adds historical context after a trigger fires. Detectors stay simple and the
 * same history index can enrich many trigger types without repeating scans.
 */
export function enrichStoryContext(draft: StoryCandidateDraft, history: StoryHistoryIndex): StoryCandidateDraft {
  switch (draft.triggerType) {
    case 'UPSET': return enrichUpset(draft, history);
    case 'CI_SURGE': return enrichCiSurge(draft, history);
    default: return draft;
  }
}
