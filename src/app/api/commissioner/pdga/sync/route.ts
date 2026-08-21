import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createPdgaClient, PdgaRequestError, type PdgaClient} from '@/lib/pdga/client';
import {createClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PDGA_CONCURRENCY = 2;
const PDGA_BATCH_DELAY_MS = 150;

type PlayerRow = {
  id: string;
  pdga_number: string | number | null;
  pdga_rating: number | null;
};

type SyncStatus = 'updated' | 'unchanged' | 'no-current-rating' | 'not-found' | 'deferred' | 'error';

type SyncResult = {
  playerId: string;
  pdgaNumber: string;
  previousRating: number | null;
  rating: number | null;
  status: SyncStatus;
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
  let stoppedEarly = false;
  let stopReason: string | undefined;

  try {
    for (let index = 0; index < eligiblePlayers.length; index += PDGA_CONCURRENCY) {
      const batch = eligiblePlayers.slice(index, index + PDGA_CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map((player) => syncPlayer(player, pdga, supabase)),
      );

      let authenticationFailed = false;
      settled.forEach((outcome, batchIndex) => {
        if (outcome.status === 'fulfilled') {
          results.push(outcome.value);
          return;
        }

        const player = batch[batchIndex];
        if (isPdgaAuthenticationError(outcome.reason)) {
          authenticationFailed = true;
          stopReason = 'PDGA authentication expired during the sync. Run the sync again to continue.';
          return;
        }

        results.push({
          playerId: player.id,
          pdgaNumber: String(player.pdga_number).trim(),
          previousRating: player.pdga_rating,
          rating: player.pdga_rating,
          status: 'error',
          error: outcome.reason instanceof Error ? outcome.reason.message : 'PDGA sync failed for this player.',
        });
      });

      if (authenticationFailed) {
        stoppedEarly = true;
        break;
      }

      if (index + PDGA_CONCURRENCY < eligiblePlayers.length) {
        await delay(PDGA_BATCH_DELAY_MS);
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
      deferred: 0,
      error: 0,
    } as Record<SyncStatus, number>,
  );

  const unprocessed = eligiblePlayers.length - results.length;
  if (stoppedEarly && unprocessed > 0) summary.deferred += unprocessed;

  if (summary.deferred > 0 || summary.error > 0 || stoppedEarly) {
    console.warn('PDGA rating sync completed with incomplete lookups.', {
      total: eligiblePlayers.length,
      processed: results.length,
      deferred: summary.deferred,
      errors: summary.error,
      stoppedEarly,
      stopReason,
    });
  }

  return Response.json({
    ok: summary.error === 0 && !stoppedEarly,
    total: eligiblePlayers.length,
    processed: results.length,
    summary,
    stoppedEarly,
    stopReason,
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

    if (updateError) throw updateError;

    return {
      playerId: player.id,
      pdgaNumber,
      previousRating,
      rating: parsedRating,
      status: 'updated',
    };
  } catch (error) {
    if (isPdgaAuthenticationError(error)) throw error;

    if (error instanceof PdgaRequestError && isTemporaryPdgaStatus(error.status)) {
      return {
        playerId: player.id,
        pdgaNumber,
        previousRating,
        rating: previousRating,
        status: 'deferred',
        error: error.message,
      };
    }

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

function isPdgaAuthenticationError(error: unknown): boolean {
  return error instanceof PdgaRequestError && (error.status === 401 || error.status === 403);
}

function isTemporaryPdgaStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
