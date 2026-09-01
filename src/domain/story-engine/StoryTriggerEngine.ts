import type {RatedResult} from './RatedResult';
import type {StoryCandidate, StoryCandidateDraft} from './StoryCandidate';
import {enrichStoryContext} from './StoryContextEnricher';
import {StoryHistoryIndex} from './StoryHistoryIndex';
import {finalizeStoryCandidate} from './StoryScoring';
import {detectUpsets} from './triggers/UpsetTrigger';
import {detectWinStreaks} from './triggers/WinStreakTrigger';

export type StoryTriggerDetector = (results: RatedResult[]) => StoryCandidateDraft[];

const V1_DETECTORS: StoryTriggerDetector[] = [
  detectUpsets,
  detectWinStreaks,
];

/**
 * Pure Clash Pulse entry point. The engine reads authoritative rated results,
 * detects editorial candidates, enriches them from the same historical result
 * set, scores them, and returns a stable ranking.
 */
export function buildStoryCandidates(
  results: RatedResult[],
  detectors: StoryTriggerDetector[] = V1_DETECTORS,
): StoryCandidate[] {
  const seen = new Set<string>();
  const history = new StoryHistoryIndex(results);
  const candidates = detectors.flatMap((detector) => detector(results));

  return candidates
    .filter((candidate) => {
      if (seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    })
    .map((candidate) => enrichStoryContext(candidate, history))
    .map(finalizeStoryCandidate)
    .sort((a, b) => b.storyScore - a.storyScore || a.id.localeCompare(b.id));
}
