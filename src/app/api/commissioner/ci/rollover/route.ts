import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function rollover(previewOnly: boolean) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return Response.json({error: 'Authentication required.'}, {status: 401});
  const profile = await new SupabaseLaunchRepository(supabase).getProfileByUserId(user.id);
  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    return Response.json({error: 'Approved commissioner access is required.'}, {status: 403});
  }
  const {data: season, error: seasonError} = await supabase.from('launch_seasons')
    .select('id').eq('active', true).eq('archived', false).maybeSingle();
  if (seasonError || !season) {
    return Response.json({error: seasonError?.message ?? 'No active season.'}, {status: 409});
  }
  const {data, error} = await supabase.rpc('apply_clash_season_rollover', {
    target_season_id: season.id, preview_only: previewOnly,
  });
  if (error) return Response.json({error: error.message}, {status: 409});
  return Response.json(data);
}

export async function GET() { return rollover(true); }
export async function POST() { return rollover(false); }
