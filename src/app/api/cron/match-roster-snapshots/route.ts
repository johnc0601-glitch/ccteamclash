import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import {createAdminClient} from '@/lib/supabase/admin';
import {snapshotErrorClass} from '@/domain/match-roster/MatchRosterSnapshotAutomation';
import {isCronRequestAuthorized, runSnapshotCron} from './cron';
import {processPredictionCaptures} from '@/services/teamStrength/PredictionCaptureRunner';
import {SupabasePredictionSnapshotRepository} from '@/services/teamStrength/PredictionSnapshotRepository';
import {SupabasePredictionCaptureCandidateRepository} from '@/services/teamStrength/SupabasePredictionCaptureCandidateRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({error: 'Unauthorized.'}, {status: 401});
  }

  try {
    const client = createAdminClient();
    const repository = new SupabaseMatchRosterRepository(client);
    const summary = await runSnapshotCron(new MatchRosterService(repository, undefined, repository));
    const predictions = await processPredictionCaptures({
      candidateRepository: new SupabasePredictionCaptureCandidateRepository(client),
      snapshotRepository: new SupabasePredictionSnapshotRepository(client),
      onError: ({matchId, error}) => console.error('Prediction capture failed.', {
        matchId, errorClass: snapshotErrorClass(error),
      }),
    });
    return Response.json({...summary, predictions}, {
      status: summary.failed || predictions.failed ? 500 : 200,
    });
  } catch (error) {
    console.error('Match roster snapshot cron failed.', {operation: 'cron', errorClass: snapshotErrorClass(error)});
    return Response.json({processed: 0, succeeded: 0, alreadyComplete: 0, failed: 1}, {status: 500});
  }
}
