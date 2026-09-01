import type {RatedResultRepository} from './RatedResultRepository';
import {backtestStoryEngine, type StoryBacktest} from './StoryBacktest';
import type {StoryCandidate} from './StoryCandidate';
import type {StoryScope} from './StoryScope';
import {buildStoryCandidates} from './StoryTriggerEngine';

export type ClashPulseSeasonSummary = {
  seasonId: string;
  seasonName: string | null;
  resultRows: number;
  events: number;
};

/**
 * Application-facing read service for Clash Pulse. It never writes ratings,
 * results, stories, or database state; publishing remains a separate workflow.
 */
export class ClashPulseService {
  constructor(private readonly repository: RatedResultRepository) {}

  async getCandidates(scope: StoryScope): Promise<StoryCandidate[]> {
    return buildStoryCandidates(await this.repository.getRatedResults(), scope);
  }

  async backtest(seasonId?: string): Promise<StoryBacktest> {
    return backtestStoryEngine(await this.repository.getRatedResults(), seasonId);
  }

  async getSeasonSummaries(): Promise<ClashPulseSeasonSummary[]> {
    const results = await this.repository.getRatedResults();
    const bySeason = new Map<string, {seasonName: string | null; rows: number; events: Set<string>} >();
    for (const result of results) {
      const current = bySeason.get(result.seasonId) ?? {
        seasonName: result.seasonName ?? null,
        rows: 0,
        events: new Set<string>(),
      };
      current.rows += 1;
      current.events.add(result.eventId);
      if (!current.seasonName && result.seasonName) current.seasonName = result.seasonName;
      bySeason.set(result.seasonId, current);
    }

    return [...bySeason.entries()]
      .map(([seasonId, value]) => ({
        seasonId,
        seasonName: value.seasonName,
        resultRows: value.rows,
        events: value.events.size,
      }))
      .sort((a, b) => a.seasonId.localeCompare(b.seasonId));
  }
}
