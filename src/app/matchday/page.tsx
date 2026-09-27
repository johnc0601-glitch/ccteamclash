import {redirect} from 'next/navigation';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {getOwnClubhouseContext} from '@/lib/clubhouse';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MatchdayShortcutPage() {
  const supabase = await createClient();
  const context = await getOwnClubhouseContext(supabase);

  if (!context?.teamId) redirect('/schedule');

  const schedule = await createServerScheduleService();
  const nextMatch = await schedule.getTeamNextEvent(context.teamId);

  redirect(nextMatch?.href || '/schedule');
}
