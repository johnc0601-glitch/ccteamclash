import type {RatedResult} from './RatedResult';
import type {StoryCandidate, StoryCandidateDraft} from './StoryCandidate';
import {enrichStoryContext} from './StoryContextEnricher';
import {StoryHistoryIndex} from './StoryHistoryIndex';
import {finalizeStoryCandidate} from './StoryScoring';
import type {StoryScope} from './StoryScope';
import {detectCiSurges} from './triggers/CiSurgeTrigger';
import {detectDoublesChemistry} from './triggers/DoublesChemistryTrigger';
import {detectPersonalBests} from './triggers/PersonalBestTrigger';
import {detectRecords} from './triggers/RecordTrigger';
import {detectStreaksSnapped} from './triggers/StreakSnappedTrigger';
import {detectUpsets} from './triggers/UpsetTrigger';
import {detectWinStreaks} from './triggers/WinStreakTrigger';

export type StoryTriggerDetector = (results: RatedResult[]) => StoryCandidateDraft[];

const V1_DETECTORS: StoryTriggerDetector[] = [
  detectUpsets,
  detectWinStreaks,
  detectStreaksSnapped,
  detectCiSurges,
  detectPersonalBests,
  detectRecords,
  detectDoublesChemistry,
];

function resultsForScope(results: RatedResult[], scope: StoryScope): RatedResult[] {
  switch (scope.kind) {
    case 'Match': return results.filter((result) => result.matchId === scope.matchId);
    case 'Round': return results.filter((result) => result.eventId === scope.eventId);
    case 'Season': return results.filter((result) => result.seasonId === scope.seasonId);
    case 'AllTime': return results;
  }
}

function candidateInScope(candidate: StoryCandidateDraft, scope: StoryScope): boolean {
  switch (scope.kind) {
    case 'Match': return candidate.matchId === scope.matchId;
    case 'Round': return candidate.eventId === scope.eventId;
    case 'Season': return candidate.seasonId === scope.seasonId;
    case 'AllTime': return true;
  }
}

/**
 * Pure Clash Pulse entry point. Full authoritative history is supplied for
 * context, while scope defines which activity is allowed to emit a new story.
 * For past-round backtests, history is cut off at that round so future results
 * cannot leak into the candidate or its historical ranking.
 */
export function buildStoryCandidates(
  results: RatedResult[],
  scope: StoryScope,
  detectors: StoryTriggerDetector[] = V1_DETECTORS,
): StoryCandidate[] {
  const activity = resultsForScope(results, scope);
  if (activity.length === 0) return [];

  const cutoff = activity.reduce((latest, result) => result.playedAt > latest ? result.playedAt : latest, activity[0].playedAt);
  const availableHistory = scope.kind === 'AllTime'
    ? results
    : results.filter((result) => result.playedAt <= cutoff);
  const history = new StoryHistoryIndex(availableHistory);
  const seen = new Set<string>();
  const candidates = detectors.flatMap((detector) => detector(availableHistory));

  return candidates
    .filter((candidate) => candidateInScope(candidate, scope))
    .filter((candidate) => {
      if (seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    })
    .map((candidate) => enrichStoryContext(candidate, history))
    .map(finalizeStoryCandidate)
    .sort((a, b) => b.storyScore - a.storyScore || a.id.localeCompare(b.id));
}
