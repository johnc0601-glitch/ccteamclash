import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import {buildStoryBacktestReport} from '@/domain/story-engine/StoryBacktestReport';
import {PublicHistoricalPulseRepository} from '@/domain/story-engine/PublicHistoricalPulseRepository';
import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readableErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Clash Pulse could not be loaded.';
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
    const requestedLimit = Number(url.searchParams.get('limit') ?? 50);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(10, Math.round(requestedLimit)))
      : 50;

    const report = seasonId
      ? buildStoryBacktestReport(build.results, seasonId, limit)
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
