import {createClient} from '@/lib/supabase/server';
import {buildStoryBacktestReport} from '@/domain/story-engine/StoryBacktestReport';
import {SupabaseHistoricalRatedResultRepository} from '@/domain/story-engine/SupabaseHistoricalRatedResultRepository';
import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireStoryCommissioner();

    const supabase = await createClient();
    const repository = new SupabaseHistoricalRatedResultRepository(supabase);
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

    const message = error instanceof Error ? error.message : 'Clash Pulse could not be loaded.';
    return Response.json({error: message}, {status: 500});
  }
}
