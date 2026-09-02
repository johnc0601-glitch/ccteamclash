import type {RatedResult} from './RatedResult';
import type {StoryCandidate, StoryTriggerType} from './StoryCandidate';
import {buildStoryCandidates} from './StoryTriggerEngine';

export type StoryBacktestRound = {
  seasonId: string;
  eventId: string;
  playedAt: string;
  candidates: StoryCandidate[];
};

export type StoryBacktest = {
  rounds: StoryBacktestRound[];
  candidates: StoryCandidate[];
  countsByTrigger: Partial<Record<StoryTriggerType, number>>;
};

type RoundKey = {
  seasonId: string;
  eventId: string;
  playedAt: string;
};

/**
 * Replays Clash Pulse one round at a time. buildStoryCandidates applies the
 * historical cutoff for each round, so this can be used to tune thresholds on
 * old seasons without leaking later results into earlier story context.
 */
export function backtestStoryEngine(results: RatedResult[], seasonId?: string): StoryBacktest {
  const selected = seasonId ? results.filter((result) => result.seasonId === seasonId) : results;
  const roundKeys = new Map<string, RoundKey>();

  for (const result of selected) {
    const key = `${result.seasonId}\u0000${result.eventId}`;
    const current = roundKeys.get(key);
    if (!current || result.playedAt > current.playedAt) {
      roundKeys.set(key, {seasonId: result.seasonId, eventId: result.eventId, playedAt: result.playedAt});
    }
  }

  const rounds = [...roundKeys.values()]
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.eventId.localeCompare(b.eventId))
    .map((round) => ({
      ...round,
      candidates: buildStoryCandidates(results, {kind: 'Round', eventId: round.eventId}),
    }));

  const candidates = rounds.flatMap((round) => round.candidates);
  const countsByTrigger: Partial<Record<StoryTriggerType, number>> = {};
  for (const candidate of candidates) {
    countsByTrigger[candidate.triggerType] = (countsByTrigger[candidate.triggerType] ?? 0) + 1;
  }

  return {rounds, candidates, countsByTrigger};
}
