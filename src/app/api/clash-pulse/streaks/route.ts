import {StoryAccessError} from '@/services/stories/StoryEditorAccess';
import {requireClashPulseReader} from '@/services/pulse/PulseReaderAccess';
import {verifiedRoundRatings, generateRoundFacts} from '@/services/pulse/PulseFacts';
import {generateAcrossSeasonStreakFacts} from '@/services/pulse/PulseHistoricalStreaks';
import {loadHistoricalStreakSource} from '@/services/pulse/PulseHistoricalStreakLoader';
import {loadPulseOptions, loadPulseSource} from '@/services/pulse/PulseLibraryService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Read-only and calculated on demand: looking at a streak never rewrites a
 * saved fact, published highlight, rating, or finalized match. */
// Streak research has been withdrawn pending verification. Keep the source
// code for later review but do not serve unfinished streak claims.
export async function GET(request: Request) {
  return Response.json({error: 'Streak research is temporarily unavailable.'}, {status: 404});
  /*
  try {
    const {supabase, isCommissioner} = await requireClashPulseReader();
    const roundId = new URL(request.url).searchParams.get('round');
    if (!roundId || roundId.length > 200) {
      return Response.json({error: 'Select a valid round.'}, {status: 400});
    }
    const {rounds} = await loadPulseOptions(supabase);
    const round = rounds.find(item => item.id === roundId);
    if (!round) return Response.json({error: 'Round not found.'}, {status: 404});
    if (!isCommissioner) {
      const {data: season, error} = await supabase.from('launch_seasons')
        .select('id').eq('id', round.season_id).eq('published', true).maybeSingle();
      if (error) throw error;
      if (!season) return Response.json({error: 'Round not available to readers.'}, {status: 403});
    }
    const [source, archive] = await Promise.all([
      loadPulseSource(supabase, round.season_id, round.id),
      loadHistoricalStreakSource(supabase),
    ]);
    const verified = source.rounds
      .filter(item => item.season_id === round.season_id && item.number <= round.number)
      .flatMap(item => verifiedRoundRatings(source, item.id));
    const facts = generateAcrossSeasonStreakFacts(source, round, verified, archive);
    const report = generateRoundFacts(source, round.id);
    const categorized = (category: 'Streaks' | 'Broken streaks') => {
      const all = facts.filter(fact => fact.category === category)
        .sort((a, b) => (b.metric ?? 0) - (a.metric ?? 0)
          || a.fact_key.localeCompare(b.fact_key));
      return {count: all.length, facts: all.slice(0, 10)};
    };
    return Response.json({
      round: {id: round.id, number: round.number, date: round.date},
      ongoing: categorized('Streaks'),
      broken: categorized('Broken streaks'),
      note: 'Across recorded league seasons through this round. Team matches and separate singles/doubles appearances. Unknown team scores and unverifiable player appearances interrupt runs; at least two results required.',
      warnings: report.warnings.filter(w => /snapshot|ratings|result|streak/i.test(w)).slice(0, 8),
    }, {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    if (error instanceof StoryAccessError) return Response.json({error: error.message}, {status: error.status});
    console.error('[pulse-streaks]', error);
    return Response.json({error: 'Unable to calculate verified streaks for this round.'}, {status: 500});
  }
  */
}
