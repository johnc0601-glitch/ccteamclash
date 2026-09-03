import {ClashPulseSnapshotStore} from '@/domain/story-engine/ClashPulseSnapshotStore';
import {pulseFactText} from '@/domain/story-engine/PulseFactFormatter';
import type {StoryCandidate} from '@/domain/story-engine/StoryCandidate';
import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ClashLineRow = {
  id: string;
  source_candidate_id: string;
  trigger_type: string;
  fact_text: string;
  season_id: string | null;
  event_id: string | null;
  match_id: string | null;
  published_at: string;
};

function failure(error: unknown) {
  if (error instanceof StoryAccessError) return Response.json({error: error.message}, {status: error.status});
  const message = error instanceof Error ? error.message : 'Clash Line request failed.';
  console.error('[clash-line] Commissioner request failed', {message});
  return Response.json({error: message}, {status: 500});
}

function candidateMap(candidates: StoryCandidate[]) {
  return new Map(candidates.map((candidate) => [candidate.id, candidate]));
}

export async function GET() {
  try {
    const {supabase} = await requireStoryCommissioner();
    const {data, error} = await (supabase as any)
      .from('clash_line_items')
      .select('id,source_candidate_id,trigger_type,fact_text,season_id,event_id,match_id,published_at')
      .eq('is_active', true)
      .order('published_at', {ascending: false});
    if (error) throw error;

    return Response.json({
      items: ((data ?? []) as ClashLineRow[]).map((row) => ({
        id: row.id,
        sourceCandidateId: row.source_candidate_id,
        triggerType: row.trigger_type,
        text: row.fact_text,
        seasonId: row.season_id,
        eventId: row.event_id,
        matchId: row.match_id,
        publishedAt: row.published_at,
      })),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const {supabase} = await requireStoryCommissioner();
    const body = await request.json().catch(() => ({})) as {seasonId?: string; candidateIds?: string[]};
    const seasonId = body.seasonId?.trim() ?? '';
    const candidateIds = [...new Set((body.candidateIds ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(0, 12);
    if (!seasonId || candidateIds.length === 0) {
      return Response.json({error: 'Select at least one verified Pulse fact.'}, {status: 400});
    }

    const snapshot = await new ClashPulseSnapshotStore(supabase as any).get(seasonId);
    if (!snapshot) return Response.json({error: 'Saved Pulse snapshot not found. Refresh Pulse first.'}, {status: 409});

    const available = candidateMap([...snapshot.report.topCandidates, ...(snapshot.report.eventCandidates ?? [])]);
    const selected = candidateIds.map((id) => available.get(id)).filter((candidate): candidate is StoryCandidate => Boolean(candidate));
    if (selected.length !== candidateIds.length) {
      return Response.json({error: 'One or more selected facts are no longer in the saved Pulse snapshot. Refresh the page and try again.'}, {status: 409});
    }

    const now = new Date().toISOString();
    const rows = selected.map((candidate) => ({
      source_candidate_id: candidate.id,
      trigger_type: candidate.triggerType,
      fact_text: pulseFactText(candidate),
      season_id: candidate.seasonId,
      event_id: candidate.eventId ?? null,
      match_id: candidate.matchId ?? null,
      is_active: true,
      published_at: now,
      updated_at: now,
    }));

    const {error} = await (supabase as any)
      .from('clash_line_items')
      .upsert(rows, {onConflict: 'source_candidate_id'});
    if (error) throw error;

    return Response.json({published: rows.length});
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const {supabase} = await requireStoryCommissioner();
    const body = await request.json().catch(() => ({})) as {id?: string};
    const id = body.id?.trim() ?? '';
    if (!id) return Response.json({error: 'Clash Line item ID is required.'}, {status: 400});

    const {error} = await (supabase as any)
      .from('clash_line_items')
      .update({is_active: false, updated_at: new Date().toISOString()})
      .eq('id', id);
    if (error) throw error;

    return Response.json({removed: true});
  } catch (error) {
    return failure(error);
  }
}
