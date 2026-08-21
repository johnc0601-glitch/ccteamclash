import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CorrectionRequest = {
  roundId?: string;
};

type CorrectionSummary = {
  seasonId: string;
  startingEventOrder: number;
  invalidatedEvents: number;
  invalidatedPlayerRows: number;
  affectedPlayers: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) {
    return Response.json({error: 'Authentication required.'}, {status: 401});
  }

  const launch = new SupabaseLaunchRepository(supabase);
  const profile = await launch.getProfileByUserId(user.id);
  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    return Response.json({error: 'Approved commissioner access is required.'}, {status: 403});
  }

  let body: CorrectionRequest;
  try {
    body = await request.json() as CorrectionRequest;
  } catch {
    return Response.json({error: 'A JSON request body is required.'}, {status: 400});
  }

  const roundId = body.roundId?.trim();
  if (!roundId) {
    return Response.json({error: 'roundId is required.'}, {status: 400});
  }

  const db = supabase as any;
  const {data, error} = await db.rpc('prepare_clash_rating_correction', {
    p_event_key: roundId,
  });

  if (error) {
    const notFound = /not finalized/i.test(error.message ?? '');
    return Response.json({error: error.message}, {status: notFound ? 409 : 500});
  }

  const summary = data as CorrectionSummary;
  return Response.json({ok: true, summary});
}
