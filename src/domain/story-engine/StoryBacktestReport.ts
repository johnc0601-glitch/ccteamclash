import type {RatedResult} from './RatedResult';
import type {StoryCandidate, StoryTriggerType} from './StoryCandidate';
import {backtestStoryEngine} from './StoryBacktest';
import {storyImportance, type StoryImportance} from './StoryScoring';

export type StoryBacktestEventSummary = {
  eventId: string;
  eventLabel: string;
  eventOrder: number | null;
  resultRows: number;
  candidateCount: number;
  topScore: number | null;
};

export type StoryBacktestScoreDistribution = {
  minimum: number | null;
  median: number | null;
  p75: number | null;
  p90: number | null;
  maximum: number | null;
};

export type StoryBacktestReport = {
  seasonId: string;
  seasonName: string;
  resultRows: number;
  events: StoryBacktestEventSummary[];
  candidateCount: number;
  countsByTrigger: Partial<Record<StoryTriggerType, number>>;
  countsByImportance: Record<StoryImportance, number>;
  scoreDistribution: StoryBacktestScoreDistribution;
  topCandidates: StoryCandidate[];
};

function percentile(sorted: number[], fraction: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function scoreDistribution(candidates: StoryCandidate[]): StoryBacktestScoreDistribution {
  const scores = candidates.map((candidate) => candidate.storyScore).sort((a, b) => a - b);
  return {
    minimum: scores[0] ?? null,
    median: percentile(scores, .5),
    p75: percentile(scores, .75),
    p90: percentile(scores, .9),
    maximum: scores.at(-1) ?? null,
  };
}

/**
 * Produces a compact tuning report from a point-in-time backtest. The report is
 * intentionally factual: it summarizes trigger volume and scores without
 * deciding which candidates should become published stories.
 */
export function buildStoryBacktestReport(
  results: RatedResult[],
  seasonId: string,
  topCandidateLimit = 20,
): StoryBacktestReport {
  const seasonResults = results.filter((result) => result.seasonId === seasonId);
  const seasonName = seasonResults.find((result) => result.seasonName)?.seasonName ?? seasonId;
  const backtest = backtestStoryEngine(results, seasonId);
  const countsByImportance: Record<StoryImportance, number> = {
    candidate: 0,
    notable: 0,
    strong: 0,
    major: 0,
  };
  for (const candidate of backtest.candidates) countsByImportance[storyImportance(candidate.storyScore)] += 1;

  const resultsByEvent = new Map<string, RatedResult[]>();
  for (const result of seasonResults) {
    const rows = resultsByEvent.get(result.eventId) ?? [];
    rows.push(result);
    resultsByEvent.set(result.eventId, rows);
  }

  const events = backtest.rounds.map((round): StoryBacktestEventSummary => {
    const rows = resultsByEvent.get(round.eventId) ?? [];
    const representative = rows[0];
    return {
      eventId: round.eventId,
      eventLabel: representative?.eventLabel ?? round.eventId,
      eventOrder: representative?.eventOrder ?? null,
      resultRows: rows.length,
      candidateCount: round.candidates.length,
      topScore: round.candidates.length
        ? Math.max(...round.candidates.map((candidate) => candidate.storyScore))
        : null,
    };
  });

  return {
    seasonId,
    seasonName,
    resultRows: seasonResults.length,
    events,
    candidateCount: backtest.candidates.length,
    countsByTrigger: backtest.countsByTrigger,
    countsByImportance,
    scoreDistribution: scoreDistribution(backtest.candidates),
    topCandidates: [...backtest.candidates]
      .sort((a, b) => b.storyScore - a.storyScore || a.id.localeCompare(b.id))
      .slice(0, Math.max(0, topCandidateLimit)),
  };
}
