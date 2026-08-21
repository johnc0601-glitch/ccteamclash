import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {
  SupabaseClashRatingFinalizer,
  type ClashFinalizationPreview,
} from '@/domain/ratings/SupabaseClashRatingFinalizer';
import {createClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FinalizeRequest = {
  roundId?: string;
  mode?: 'preview' | 'finalize';
};

export async function GET(request: Request) {
  const access = await requireCommissioner();
  if (!access.ok) return access.response;

  const roundId = new URL(request.url).searchParams.get('roundId')?.trim();
  if (!roundId) {
    return Response.json({error: 'roundId is required.'}, {status: 400});
  }

  const db = access.supabase as any;
  const {data, error} = await db
    .from('clash_rating_event_players')
    .select('event_order,event_label,calculated_at')
    .eq('event_key', roundId)
    .order('calculated_at', {ascending: false})
    .limit(1)
    .maybeSingle();

  if (error) return Response.json({error: error.message}, {status: 500});

  return Response.json({
    ok: true,
    finalized: Boolean(data),
    eventOrder: data?.event_order ?? null,
    eventLabel: data?.event_label ?? null,
    finalizedAt: data?.calculated_at ?? null,
  });
}

export async function POST(request: Request) {
  const access = await requireCommissioner();
  if (!access.ok) return access.response;

  let body: FinalizeRequest;
  try {
    body = await request.json() as FinalizeRequest;
  } catch {
    return Response.json({error: 'A JSON request body is required.'}, {status: 400});
  }

  const roundId = body.roundId?.trim();
  if (!roundId) {
    return Response.json({error: 'roundId is required.'}, {status: 400});
  }

  const mode = body.mode ?? 'preview';
  if (mode !== 'preview' && mode !== 'finalize') {
    return Response.json({error: 'mode must be preview or finalize.'}, {status: 400});
  }

  const finalizer = new SupabaseClashRatingFinalizer(access.supabase as never);

  try {
    if (mode === 'preview') {
      const preview = await finalizer.preview(roundId);
      return Response.json({ok: true, mode, preview: summarizePreview(preview)});
    }

    const result = await finalizer.finalize(roundId);
    return Response.json({
      ok: true,
      mode,
      runId: result.runId,
      preview: summarizePreview(result.preview),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clash rating finalization failed.';
    const conflict = /already been finalized|must be finalized|cannot be finalized|missing|not published/i.test(message);
    return Response.json({error: message}, {status: conflict ? 409 : 500});
  }
}

async function requireCommissioner() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: Response.json({error: 'Authentication required.'}, {status: 401}),
    };
  }

  const launch = new SupabaseLaunchRepository(supabase);
  const profile = await launch.getProfileByUserId(user.id);
  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    return {
      ok: false as const,
      response: Response.json({error: 'Approved commissioner access is required.'}, {status: 403}),
    };
  }

  return {ok: true as const, supabase};
}

function summarizePreview(preview: ClashFinalizationPreview) {
  return {
    roundId: preview.roundId,
    seasonId: preview.seasonId,
    eventOrder: preview.eventOrder,
    eventLabel: preview.eventLabel,
    eligibleMatches: preview.eligibleMatches,
    publishedMatches: preview.publishedMatches,
    participatingPlayers: preview.participatingPlayers,
    ratedContests: preview.ratedContests,
  };
}
