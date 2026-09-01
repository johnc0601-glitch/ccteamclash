import type {RatedResult} from './RatedResult';
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

function enrichStreak(draft: StoryCandidateDraft, history: StoryHistoryIndex): StoryCandidateDraft {
  const format = draft.headlineFacts.format;
  const length = draft.triggerType === 'WIN_STREAK'
    ? draft.headlineFacts.streakLength
    : draft.headlineFacts.snappedStreak;
  if ((format !== 'Singles' && format !== 'Doubles') || typeof length !== 'number') return draft;

  const seasonRank = history.winStreakRank(length, format as RatedResult['format'], {seasonId: draft.seasonId});
  const allTimeRank = history.winStreakRank(length, format as RatedResult['format']);
  if (!seasonRank && !allTimeRank) return draft;

  return {
    ...draft,
    contextFacts: {
      ...draft.contextFacts,
      seasonStreakRank: seasonRank?.rank ?? null,
      seasonStreakComparisonPlayers: seasonRank?.total ?? null,
      allTimeStreakRank: allTimeRank?.rank ?? null,
      allTimeStreakComparisonPlayers: allTimeRank?.total ?? null,
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

export function enrichStoryContext(draft: StoryCandidateDraft, history: StoryHistoryIndex): StoryCandidateDraft {
  switch (draft.triggerType) {
    case 'UPSET': return enrichUpset(draft, history);
    case 'CI_SURGE': return enrichCiSurge(draft, history);
    case 'WIN_STREAK': return enrichStreak(draft, history);
    case 'STREAK_SNAPPED': return enrichStreak(draft, history);
    default: return draft;
  }
}
