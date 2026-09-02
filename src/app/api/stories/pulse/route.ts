import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import {buildStoryBacktestReport} from '@/domain/story-engine/StoryBacktestReport';
import {PublicHistoricalPulseRepository} from '@/domain/story-engine/PublicHistoricalPulseRepository';
import type {StoryTriggerType} from '@/domain/story-engine/StoryCandidate';
import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STORY_TRIGGER_TYPES = new Set<StoryTriggerType>([
  'WIN_STREAK',
  'STREAK_SNAPPED',
  'UPSET',
  'CI_SURGE',
  'RANK_MILESTONE',
  'CAREER_MILESTONE',
  'PERSONAL_BEST',
  'FIRST_SINCE',
  'HEAD_TO_HEAD',
  'TEAM_SERIES',
  'DOUBLES_CHEMISTRY',
  'RECORD',
]);

function readableErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Clash Pulse could not be loaded.';
}

function requestedTrigger(value: string | null): StoryTriggerType | null {
  return value && STORY_TRIGGER_TYPES.has(value as StoryTriggerType)
    ? value as StoryTriggerType
    : null;
}

export async function GET(request: Request) {
  try {
    // Authorization remains environment-specific: only an approved commissioner
    // can open the desk. Historical analysis itself uses the same immutable,
    // public/RLS-protected production archive used by Stats so preview/staging
    // never needs a copy of the historical CI ledger.
    await requireStoryCommissioner();

    const historicalSupabase = await createHistoricalStatsReadClient();
    const repository = new PublicHistoricalPulseRepository(historicalSupabase);
    const build = await repository.getBuildReport();
    const seasonIds = [...new Set(build.results.map((result) => result.seasonId))].sort();

    const url = new URL(request.url);
    const requestedSeasonId = url.searchParams.get('seasonId');
    const seasonId = requestedSeasonId && seasonIds.includes(requestedSeasonId)
      ? requestedSeasonId
      : seasonIds.at(-1) ?? null;
    const trigger = requestedTrigger(url.searchParams.get('trigger'));
    const requestedLimit = Number(url.searchParams.get('limit') ?? 50);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(10, Math.round(requestedLimit)))
      : 50;

    // Build the complete season ranking first. Category filtering must not be
    // performed against only the global top 100, or valid lower-ranked facts
    // disappear from their category tabs.
    const fullReport = seasonId
      ? buildStoryBacktestReport(build.results, seasonId, Number.MAX_SAFE_INTEGER)
      : null;
    const report = fullReport
      ? {
          ...fullReport,
          topCandidates: fullReport.topCandidates
            .filter((candidate) => !trigger || candidate.triggerType === trigger)
            .slice(0, limit),
        }
      : null;

    return Response.json({
      build: {
        sourceFactRows: build.sourceFactRows,
        sourceContests: build.sourceContests,
        emittedContests: build.emittedContests,
        quarantinedContests: build.quarantinedContests,
        diagnostics: build.diagnostics,
      },
      seasonIds,
      activeTrigger: trigger,
      report,
    });
  } catch (error) {
    if (error instanceof StoryAccessError) {
      return Response.json({error: error.message}, {status: error.status});
    }

    const message = readableErrorMessage(error);
    console.error('[clash-pulse] Failed to load commissioner fact desk', {message});
    return Response.json({error: message}, {status: 500});
  }
}
