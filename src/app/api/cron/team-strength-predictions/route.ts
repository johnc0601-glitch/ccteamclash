import {createAdminClient} from '@/lib/supabase/admin';
import {isCronRequestAuthorized} from '@/app/api/cron/match-roster-snapshots/cron';
import {processPredictionCaptures} from '@/services/teamStrength/PredictionCaptureRunner';
import {SupabasePredictionCaptureCandidateRepository} from '@/services/teamStrength/SupabasePredictionCaptureCandidateRepository';
import {SupabasePredictionSnapshotRepository} from '@/services/teamStrength/PredictionSnapshotRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Prepared lifecycle writer for Team Strength V1. No Vercel schedule is added on
 * the feature branch; activation belongs to the integration/release step after
 * the snapshot migration has been applied.
 */
export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({error: 'Unauthorized.'}, {status: 401});
  }

  try {
    const supabase = createAdminClient();
    const summary = await processPredictionCaptures({
      candidateRepository: new SupabasePredictionCaptureCandidateRepository(supabase),
      snapshotRepository: new SupabasePredictionSnapshotRepository(supabase),
      onError: ({matchId, error}) => {
        console.error('Team Strength prediction capture failed for match.', {
          matchId,
          errorClass: error instanceof Error ? error.name : 'Unknown',
        });
      },
    });
    return Response.json(summary);
  } catch (error) {
    console.error('Team Strength prediction capture cron failed.', {
      errorClass: error instanceof Error ? error.name : 'Unknown',
    });
    return Response.json(
      {processed: 0, captured: 0, skipped: 0, failed: 1, reasons: {}},
      {status: 500},
    );
  }
}
