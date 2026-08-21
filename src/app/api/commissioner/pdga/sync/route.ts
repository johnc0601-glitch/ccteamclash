import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createPdgaClient, type PdgaClient} from '@/lib/pdga/client';
import {createClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PDGA_CONCURRENCY = 5;

type PlayerRow = {
  id: string;
  pdga_number: string | number | null;
  pdga_rating: number | null;
};

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

  const eligiblePlayers = ((players ?? []) as PlayerRow[]).filter(
    (player) => String(player.pdga_number ?? '').trim().length > 0,
  );

  let pdga: PdgaClient;
  try {
    pdga = await createPdgaClient();
  } catch (error) {
    return Response.json(
      {error: error instanceof Error ? error.message : 'Unable to sign in to PDGA.'},
      {status: 502},
    );
  }

  const results: SyncResult[] = [];

  try {
    for (let index = 0; index < eligiblePlayers.length; index += PDGA_CONCURRENCY) {
      const batch = eligiblePlayers.slice(index, index + PDGA_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((player) => syncPlayer(player, pdga, supabase)),
      );
      results.push(...batchResults);
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

async function syncPlayer(
  player: PlayerRow,
  pdga: PdgaClient,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SyncResult> {
  const pdgaNumber = String(player.pdga_number).trim();
  const previousRating = player.pdga_rating;

  try {
    const pdgaPlayer = await pdga.getPlayer(pdgaNumber);

    if (!pdgaPlayer) {
      return {
        playerId: player.id,
        pdgaNumber,
        previousRating,
        rating: previousRating,
        status: 'not-found',
      };
    }

    const parsedRating = pdgaPlayer.rating ? Number.parseInt(pdgaPlayer.rating, 10) : null;
    if (!parsedRating || !Number.isFinite(parsedRating)) {
      return {
        playerId: player.id,
        pdgaNumber,
        previousRating,
        rating: previousRating,
        status: 'no-current-rating',
      };
    }

    if (parsedRating === previousRating) {
      return {
        playerId: player.id,
        pdgaNumber,
        previousRating,
        rating: parsedRating,
        status: 'unchanged',
      };
    }

    const {error: updateError} = await supabase
      .from('launch_players')
      .update({pdga_rating: parsedRating, updated_at: new Date().toISOString()})
      .eq('id', player.id);

    if (updateError) {
      throw updateError;
    }

    return {
      playerId: player.id,
      pdgaNumber,
      previousRating,
      rating: parsedRating,
      status: 'updated',
    };
  } catch (error) {
    return {
      playerId: player.id,
      pdgaNumber,
      previousRating,
      rating: previousRating,
      status: 'error',
      error: error instanceof Error ? error.message : 'PDGA sync failed for this player.',
    };
  }
}
