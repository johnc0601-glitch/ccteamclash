import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import {buildClashPulseProvenance, ClashPulseSnapshotStore, type ClashPulseSnapshot} from '@/domain/story-engine/ClashPulseSnapshotStore';
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

function payload(request: Request, snapshots: ClashPulseSnapshot[], source: 'snapshot' | 'live-fallback' | 'live-debug') {
  const url = new URL(request.url);
  const seasonIds = snapshots.map((item) => item.seasonId).sort();
  const requested = url.searchParams.get('seasonId');
  const seasonId = requested && seasonIds.includes(requested) ? requested : seasonIds.at(-1) ?? null;
  const snapshot = snapshots.find((item) => item.seasonId === seasonId) ?? null;
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

async function buildLive(userId: string, refreshTrigger: string): Promise<ClashPulseSnapshot[]> {
  const repository = new PublicHistoricalPulseRepository(await createHistoricalStatsReadClient());
  const build = await repository.getBuildReport();
  const seasonIds = [...new Set(build.results.map((result) => result.seasonId))].sort();
  const generatedAt = new Date().toISOString();
  return seasonIds.map((seasonId) => {
    const report = buildStoryBacktestReport(build.results, seasonId, Number.MAX_SAFE_INTEGER);
    return {
      seasonId, seasonName: report.seasonName, report, generatedAt, generatedBy: userId, refreshTrigger,
      provenance: buildClashPulseProvenance(build.results.filter((result) => result.seasonId === seasonId), build),
    };
  });
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
    const snapshots = await new ClashPulseSnapshotStore(supabase).list();
    const debug = new URL(request.url).searchParams.get('live') === '1';
    if (snapshots.length && !debug) return Response.json(payload(request, snapshots, 'snapshot'));
    const live = await buildLive(profile.userId, debug ? 'debug' : 'missing-snapshot-fallback');
    return Response.json(payload(request, live, debug ? 'live-debug' : 'live-fallback'));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const {supabase, profile} = await requireStoryCommissioner();
    const body = await request.json().catch(() => ({})) as {trigger?: string};
    const snapshots = await buildLive(profile.userId, body.trigger?.trim() || 'commissioner-manual');
    const store = new ClashPulseSnapshotStore(supabase);
    for (const snapshot of snapshots) await store.save(snapshot);
    return Response.json({refreshed: snapshots.length, generatedAt: snapshots[0]?.generatedAt ?? new Date().toISOString()});
  } catch (error) { return failure(error); }
}
