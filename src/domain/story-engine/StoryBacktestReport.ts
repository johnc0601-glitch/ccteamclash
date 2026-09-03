import type {RatedResult} from './RatedResult';
import type {StoryCandidate, StoryTriggerType} from './StoryCandidate';
import {backtestStoryEngine} from './StoryBacktest';
import {storyImportance, type StoryImportance} from './StoryScoring';

export type StoryBacktestEventSummary = {
  eventId: string;
  eventLabel: string;
  eventOrder: number | null;
  resultRows: number;
  teamMatchCount: number;
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
  /** Season-level surfaced candidates after overlap cleanup such as CI-surge dedupe. */
  topCandidates: StoryCandidate[];
  /** Point-in-time surfaced candidates retained so a Matchday can be reviewed exactly as it happened. */
  eventCandidates: StoryCandidate[];
};

const HIDDEN_PULSE_TRIGGERS = new Set<StoryTriggerType>(['HEAD_TO_HEAD', 'PERSONAL_BEST']);

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

function numericFact(candidate: StoryCandidate, key: string): number {
  const value = candidate.headlineFacts[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

/**
 * A historical round replay can surface the same player's CI surge at several
 * later checkpoints as the window continues to qualify. The commissioner desk
 * needs one season-level fact, not every overlapping snapshot, so retain the
 * strongest CI gain for each player/season. Other trigger families keep their
 * normal point-in-time candidates.
 */
function dedupeSeasonCandidates(candidates: StoryCandidate[]): StoryCandidate[] {
  const selectedCiSurges = new Map<string, StoryCandidate>();
  const retained: StoryCandidate[] = [];

  for (const candidate of candidates) {
    if (HIDDEN_PULSE_TRIGGERS.has(candidate.triggerType)) continue;

    if (candidate.triggerType !== 'CI_SURGE') {
      retained.push(candidate);
      continue;
    }

    const playerId = candidate.playerIds[0] ?? candidate.id;
    const key = `${candidate.seasonId}\u0000${playerId}`;
    const current = selectedCiSurges.get(key);
    if (!current) {
      selectedCiSurges.set(key, candidate);
      continue;
    }

    const gainDifference = numericFact(candidate, 'ciGain') - numericFact(current, 'ciGain');
    if (gainDifference > 0 || (gainDifference === 0 && candidate.storyScore > current.storyScore)) {
      selectedCiSurges.set(key, candidate);
    }
  }

  return [...retained, ...selectedCiSurges.values()];
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
  const eventCandidates = backtest.candidates.filter((candidate) => !HIDDEN_PULSE_TRIGGERS.has(candidate.triggerType));
  const candidates = dedupeSeasonCandidates(eventCandidates);
  const countsByTrigger: Partial<Record<StoryTriggerType, number>> = {};
  const countsByImportance: Record<StoryImportance, number> = {
    candidate: 0,
    notable: 0,
    strong: 0,
    major: 0,
  };
  for (const candidate of candidates) {
    countsByTrigger[candidate.triggerType] = (countsByTrigger[candidate.triggerType] ?? 0) + 1;
    countsByImportance[storyImportance(candidate.storyScore)] += 1;
  }

  const resultsByEvent = new Map<string, RatedResult[]>();
  for (const result of seasonResults) {
    const rows = resultsByEvent.get(result.eventId) ?? [];
    rows.push(result);
    resultsByEvent.set(result.eventId, rows);
  }

  const events = backtest.rounds.map((round): StoryBacktestEventSummary => {
    const rows = resultsByEvent.get(round.eventId) ?? [];
    const representative = rows[0];
    const visibleRoundCandidates = round.candidates.filter((candidate) => !HIDDEN_PULSE_TRIGGERS.has(candidate.triggerType));
    return {
      eventId: round.eventId,
      eventLabel: representative?.eventLabel ?? round.eventId,
      eventOrder: representative?.eventOrder ?? null,
      resultRows: rows.length,
      teamMatchCount: new Set(rows.map((row) => row.matchId)).size,
      candidateCount: visibleRoundCandidates.length,
      topScore: visibleRoundCandidates.length
        ? Math.max(...visibleRoundCandidates.map((candidate) => candidate.storyScore))
        : null,
    };
  });

  return {
    seasonId,
    seasonName,
    resultRows: seasonResults.length,
    events,
    candidateCount: candidates.length,
    countsByTrigger,
    countsByImportance,
    scoreDistribution: scoreDistribution(candidates),
    topCandidates: [...candidates]
      .sort((a, b) => b.storyScore - a.storyScore || a.id.localeCompare(b.id))
      .slice(0, Math.max(0, topCandidateLimit)),
    eventCandidates: [...eventCandidates]
      .sort((a, b) => b.storyScore - a.storyScore || a.id.localeCompare(b.id)),
  };
}
