import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createPdgaClient} from '@/lib/pdga/client';
import {createClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SyncResult = {
  playerId: string;
  pdgaNumber: string;
  previousRating: number | null;
  rating: number | null;
  status: 'updated' | 'unchanged' | 'no-current-rating' | 'not-found' | 'error';
  error?: string;
};

export async function POST() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) {
    return Response.json({error: 'Authentication required.'}, {status: 401});
  }

  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);

  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    return Response.json({error: 'Approved commissioner access is required.'}, {status: 403});
  }

  const {data: players, error: playerError} = await supabase
    .from('launch_players')
    .select('id,pdga_number,pdga_rating')
    .eq('active', true);

  if (playerError) {
    return Response.json({error: playerError.message}, {status: 500});
  }

  const eligiblePlayers = players.filter((player) => String(player.pdga_number ?? '').trim().length > 0);
  const results: SyncResult[] = [];
  const pdga = await createPdgaClient();

  try {
    for (const player of eligiblePlayers) {
      const pdgaNumber = String(player.pdga_number).trim();
      const previousRating = player.pdga_rating;

      try {
        const pdgaPlayer = await pdga.getPlayer(pdgaNumber);

        if (!pdgaPlayer) {
          results.push({
            playerId: player.id,
            pdgaNumber,
            previousRating,
            rating: previousRating,
            status: 'not-found',
          });
          continue;
        }

        const parsedRating = pdgaPlayer.rating ? Number.parseInt(pdgaPlayer.rating, 10) : null;
        if (!parsedRating || !Number.isFinite(parsedRating)) {
          results.push({
            playerId: player.id,
            pdgaNumber,
            previousRating,
            rating: previousRating,
            status: 'no-current-rating',
          });
          continue;
        }

        if (parsedRating === previousRating) {
          results.push({
            playerId: player.id,
            pdgaNumber,
            previousRating,
            rating: parsedRating,
            status: 'unchanged',
          });
          continue;
        }

        const {error: updateError} = await supabase
          .from('launch_players')
          .update({pdga_rating: parsedRating, updated_at: new Date().toISOString()})
          .eq('id', player.id);

        if (updateError) {
          throw updateError;
        }

        results.push({
          playerId: player.id,
          pdgaNumber,
          previousRating,
          rating: parsedRating,
          status: 'updated',
        });
      } catch (error) {
        results.push({
          playerId: player.id,
          pdgaNumber,
          previousRating,
          rating: previousRating,
          status: 'error',
          error: error instanceof Error ? error.message : 'PDGA sync failed for this player.',
        });
      }
    }
  } finally {
    await pdga.close();
  }

  const summary = results.reduce(
    (counts, result) => {
      counts[result.status] += 1;
      return counts;
    },
    {
      updated: 0,
      unchanged: 0,
      'no-current-rating': 0,
      'not-found': 0,
      error: 0,
    } as Record<SyncResult['status'], number>,
  );

  return Response.json({
    ok: summary.error === 0,
    total: results.length,
    summary,
    results,
  });
}
