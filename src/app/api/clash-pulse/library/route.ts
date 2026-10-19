import {randomUUID} from 'node:crypto';
import {revalidatePath, revalidateTag} from 'next/cache';
import {requireStoryCommissioner, StoryAccessError} from '@/services/stories/StoryEditorAccess';
import {loadPulseLibrary, loadPulseOptions, regeneratePulseRound} from '@/services/pulse/PulseLibraryService';
import {requireClashPulseReader} from '@/services/pulse/PulseReaderAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function failure(error: unknown) {
  if (error instanceof StoryAccessError) return Response.json({error: error.message}, {status: error.status});
  console.error('[pulse-library]', error);
  return Response.json({error: error instanceof Error ? error.message : 'Fact library unavailable. Check the staging migration and source tables.'}, {status: 500});
}
export async function GET(request: Request) {
  try {
    const {supabase, isCommissioner} = await requireClashPulseReader();
    const roundId = new URL(request.url).searchParams.get('round');
    if (!roundId) {
      const options = await loadPulseOptions(supabase);
      if (isCommissioner) return Response.json(options);
      const {data: published, error} = await supabase.from('launch_seasons')
        .select('id').eq('published', true);
      if (error) throw error;
      const publishedIds = new Set((published ?? []).map(season => season.id));
      return Response.json({
        seasons: options.seasons.filter(season => publishedIds.has(season.id)),
        rounds: options.rounds.filter(round => publishedIds.has(round.season_id)),
      });
    }
    if (!isCommissioner) {
      const {data: round, error: roundError} = await supabase.from('launch_rounds')
        .select('season_id').eq('id', roundId).maybeSingle();
      if (roundError) throw roundError;
      if (!round) return Response.json({error: 'Round unavailable.'}, {status: 404});
      const {data: season, error: seasonError} = await supabase.from('launch_seasons')
        .select('id').eq('id', round.season_id).eq('published', true).maybeSingle();
      if (seasonError) throw seasonError;
      if (!season) return Response.json({error: 'Round unavailable.'}, {status: 403});
    }
    const library = await loadPulseLibrary(supabase, roundId);
    return Response.json(isCommissioner ? library : {
      ...library,
      facts: library.facts.filter(fact => fact.status !== 'hidden' && fact.is_current),
    });
  } catch (error) {return failure(error);}
}
export async function POST(request: Request) {
  try {
    const {supabase} = await requireStoryCommissioner();
    const body = await request.json();
    if (typeof body.seasonId !== 'string' || typeof body.roundId !== 'string'
      || body.seasonId.length > 200 || body.roundId.length > 200) return Response.json({error: 'Season and round required.'}, {status: 400});
    if (body.action === 'generate') {
      await regeneratePulseRound(supabase, body.seasonId, body.roundId);
    } else if (body.action === 'editorial') {
      if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 4000) return Response.json({error: 'Enter an editorial fact (up to 4,000 characters).'}, {status: 400});
      const {rounds} = await loadPulseOptions(supabase);
      if (!rounds.some(r => r.id === body.roundId && r.season_id === body.seasonId)) return Response.json({error: 'Invalid season and round.'}, {status: 400});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const {error} = await (supabase as any).from('clash_pulse_facts').insert({
        season_id: body.seasonId, round_id: body.roundId, fact_key: `editorial:${randomUUID()}`,
        category: 'Editorial', fact_text: body.text.trim(), origin: 'editorial', source_hash: randomUUID(),
        calculation: 'Commissioner supplied editorial note; not an automatically verified statistic.',
        sources: [], status: 'pending',
      });
      if (error) throw error;
    } else return Response.json({error: 'Invalid action.'}, {status: 400});
    revalidateTag('public:clash-pulse', 'max');
    revalidatePath('/');
    return Response.json(await loadPulseLibrary(supabase, body.roundId));
  } catch (error) {return failure(error);}
}
export async function PATCH(request: Request) {
  try {
    const {supabase} = await requireStoryCommissioner();
    const body = await request.json();
    if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)
      || !['approve','hide','feature','unfeature'].includes(body.action)) return Response.json({error: 'Invalid review action.'}, {status: 400});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {error} = await (supabase as any).rpc('review_clash_pulse_fact', {p_id: body.id, p_action: body.action});
    if (error) throw error;
    revalidateTag('public:clash-pulse', 'max');
    revalidatePath('/');
    return Response.json({ok: true});
  } catch (error) {return failure(error);}
}
