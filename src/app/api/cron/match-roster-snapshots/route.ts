import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import {createAdminClient} from '@/lib/supabase/admin';
import {snapshotErrorClass} from '@/domain/match-roster/MatchRosterSnapshotAutomation';
import {isCronRequestAuthorized, runSnapshotCron} from './cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({error: 'Unauthorized.'}, {status: 401});
  }

  try {
    const repository = new SupabaseMatchRosterRepository(createAdminClient());
    const summary = await runSnapshotCron(new MatchRosterService(repository, undefined, repository));
    return Response.json(summary);
  } catch (error) {
    console.error('Match roster snapshot cron failed.', {operation: 'cron', errorClass: snapshotErrorClass(error)});
    return Response.json({processed: 0, succeeded: 0, alreadyComplete: 0, failed: 1}, {status: 500});
  }
}
