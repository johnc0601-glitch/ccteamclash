import {requireStoryCommissioner, StoryAccessError} from '@/services/stories/StoryEditorAccess';
import {generateRoundFacts} from '@/services/pulse/PulseFacts';
import {loadPulseOptions, loadPulseSource} from '@/services/pulse/PulseLibraryService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Read-only and calculated on demand: looking at a streak never rewrites a
 * saved fact, published highlight, rating, or finalized match. */
export async function GET(request: Request) {
  try {
    const {supabase} = await requireStoryCommissioner();
    const roundId = new URL(request.url).searchParams.get('round');
    if (!roundId || roundId.length > 200) {
      return Response.json({error: 'Select a valid round.'}, {status: 400});
    }
    const {rounds} = await loadPulseOptions(supabase);
    const round = rounds.find(item => item.id === roundId);
    if (!round) return Response.json({error: 'Round not found.'}, {status: 404});
    const source = await loadPulseSource(supabase, round.season_id, round.id);
    const report = generateRoundFacts(source, round.id);
    const categorized = (category: 'Streaks' | 'Broken streaks') => {
      const all = report.facts.filter(fact => fact.category === category)
        .sort((a, b) => (b.metric ?? 0) - (a.metric ?? 0)
          || a.fact_key.localeCompare(b.fact_key));
      return {count: all.length, facts: all.slice(0, 10)};
    };
    return Response.json({
      round: {id: round.id, number: round.number, date: round.date},
      ongoing: categorized('Streaks'),
      broken: categorized('Broken streaks'),
      note: 'Season-only confirmed runs through this round. At least two consecutive results required. Missing or inconsistent sources interrupt streaks.',
      warnings: report.warnings.filter(w => /snapshot|ratings|result|streak/i.test(w)).slice(0, 8),
    }, {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    if (error instanceof StoryAccessError) return Response.json({error: error.message}, {status: error.status});
    console.error('[pulse-streaks]', error);
    return Response.json({error: 'Unable to calculate verified streaks for this round.'}, {status: 500});
  }
}
