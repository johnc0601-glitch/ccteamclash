import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import {
  buildClashPulseProvenance,
  CLASH_PULSE_SNAPSHOT_VERSION,
  ClashPulseSnapshotStore,
  type ClashPulseSnapshot,
} from '@/domain/story-engine/ClashPulseSnapshotStore';
import {buildStoryBacktestReport, type StoryBacktestReport} from '@/domain/story-engine/StoryBacktestReport';
import {PublicHistoricalPulseRepository} from '@/domain/story-engine/PublicHistoricalPulseRepository';
import type {StoryTriggerType} from '@/domain/story-engine/StoryCandidate';
import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRIGGERS = new Set<StoryTriggerType>(['WIN_STREAK', 'STREAK_SNAPPED', 'UPSET', 'CI_SURGE', 'RANK_MILESTONE', 'CAREER_MILESTONE', 'PERSONAL_BEST', 'FIRST_SINCE', 'HEAD_TO_HEAD', 'TEAM_SERIES', 'DOUBLES_CHEMISTRY', 'RECORD']);

function requestedTrigger(value: string | null): StoryTriggerType | null {
  return value && TRIGGERS.has(value as StoryTriggerType) ? value as StoryTriggerType : null;
}

function payload(
  request: Request,
  seasonIds: string[],
  snapshot: ClashPulseSnapshot | null,
  source: 'snapshot' | 'live-fallback' | 'live-debug',
) {
  const url = new URL(request.url);
  const trigger = requestedTrigger(url.searchParams.get('trigger'));
  const rawLimit = Number(url.searchParams.get('limit') ?? 50);
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(10, Math.round(rawLimit))) : 50;
  const report: StoryBacktestReport | null = snapshot ? {
    ...snapshot.report,
    topCandidates: snapshot.report.topCandidates.filter((candidate) => !trigger || candidate.triggerType === trigger).slice(0, limit),
  } : null;
  return {
    source,
    snapshot: snapshot ? {generatedAt: snapshot.generatedAt, refreshTrigger: snapshot.refreshTrigger, provenance: snapshot.provenance} : null,
    build: snapshot?.provenance ?? {sourceFactRows: 0, sourceContests: 0, emittedContests: 0, quarantinedContests: 0},
    seasonIds,
    activeTrigger: trigger,
    report,
  };
}

type LiveBuild = {
  seasonIds: string[];
  snapshots: ClashPulseSnapshot[];
};

async function buildLive(
  userId: string,
  refreshTrigger: string,
  requestedSeasonId: string | null,
  allSeasons = false,
): Promise<LiveBuild> {
  const repository = new PublicHistoricalPulseRepository(await createHistoricalStatsReadClient());
  const build = await repository.getBuildReport();
  const seasonIds = [...new Set(build.results.map((result) => result.seasonId))].sort();
  const generatedAt = new Date().toISOString();
  const selectedSeasonId = requestedSeasonId && seasonIds.includes(requestedSeasonId)
    ? requestedSeasonId
    : seasonIds.at(-1) ?? null;
  const targetSeasonIds = allSeasons ? seasonIds : selectedSeasonId ? [selectedSeasonId] : [];

  return {
    seasonIds,
    snapshots: targetSeasonIds.map((seasonId) => {
      const report = buildStoryBacktestReport(build.results, seasonId, Number.MAX_SAFE_INTEGER);
      return {
        seasonId,
        seasonName: report.seasonName,
        report,
        generatedAt,
        generatedBy: userId,
        refreshTrigger,
        provenance: buildClashPulseProvenance(build.results.filter((result) => result.seasonId === seasonId), build),
      };
    }),
  };
}

function failure(error: unknown) {
  if (error instanceof StoryAccessError) return Response.json({error: error.message}, {status: error.status});
  const message = error instanceof Error ? error.message : 'Clash Pulse could not be loaded.';
  console.error('[clash-pulse] Request failed', {message});
  return Response.json({error: message}, {status: 500});
}

export async function GET(request: Request) {
  try {
    const {supabase, profile} = await requireStoryCommissioner();
    const store = new ClashPulseSnapshotStore(supabase);
    const url = new URL(request.url);
    const requestedSeasonId = url.searchParams.get('seasonId');
    const debug = url.searchParams.get('live') === '1';

    if (debug) {
      const live = await buildLive(profile.userId, 'debug', requestedSeasonId, false);
      return Response.json(payload(request, live.seasonIds, live.snapshots[0] ?? null, 'live-debug'));
    }

    const savedSeasonIds = await store.listSeasonIds();
    const savedSeasonId = requestedSeasonId
      ? (savedSeasonIds.includes(requestedSeasonId) ? requestedSeasonId : null)
      : savedSeasonIds.at(-1) ?? null;

    if (savedSeasonId) {
      const saved = await store.get(savedSeasonId);
      if (saved?.provenance.snapshotVersion === CLASH_PULSE_SNAPSHOT_VERSION) {
        return Response.json(payload(request, savedSeasonIds, saved, 'snapshot'));
      }
    }

    // Missing or stale snapshot: calculate only the requested/latest season once,
    // save it immediately, and let every subsequent request use the materialized report.
    const live = await buildLive(profile.userId, 'missing-or-stale-snapshot', requestedSeasonId ?? savedSeasonId, false);
    const snapshot = live.snapshots[0] ?? null;
    if (snapshot) await store.save(snapshot);
    const seasonIds = [...new Set([...savedSeasonIds, ...live.seasonIds])].sort();
    return Response.json(payload(request, seasonIds, snapshot, 'live-fallback'));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const {supabase, profile} = await requireStoryCommissioner();
    const body = await request.json().catch(() => ({})) as {trigger?: string};
    const live = await buildLive(profile.userId, body.trigger?.trim() || 'commissioner-manual', null, true);
    await new ClashPulseSnapshotStore(supabase).saveMany(live.snapshots);
    return Response.json({
      refreshed: live.snapshots.length,
      generatedAt: live.snapshots[0]?.generatedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    return failure(error);
  }
}
