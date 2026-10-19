import {requireClashPulseReader} from '@/services/pulse/PulseReaderAccess';
import {StoryAccessError} from '@/services/stories/StoryEditorAccess';
import {loadPulseOptions, loadPulseSource} from '@/services/pulse/PulseLibraryService';
import {buildRoundPulse, copyRoundPulse} from '@/services/pulse/RoundPulseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const {supabase, isCommissioner} = await requireClashPulseReader();
    const options = await loadPulseOptions(supabase);
    const active = options.seasons.find(season=>season.active);
    if (!active) return Response.json({rounds: [], defaultRoundId: null});
    if (!isCommissioner) {
      const {data, error} = await supabase.from('launch_seasons')
        .select('id').eq('id', active.id).eq('published', true).maybeSingle();
      if (error) throw error;
      if (!data) return Response.json({error: 'Season unavailable.'},{status: 403});
    }
    const rounds = options.rounds.filter(round=>round.season_id===active.id)
      .sort((a,b)=>b.number-a.number);
    const roundId = new URL(request.url).searchParams.get('round');
    if (roundId) {
      if (roundId.length>200 || !rounds.some(round=>round.id===roundId)) {
        return Response.json({error: 'Round not found in the active season.'}, {status: 404});
      }
      if (!isCommissioner) {
        const {data,error} = await supabase.from('launch_rounds')
          .select('id').eq('id',roundId).eq('published',true).maybeSingle();
        if (error) throw error;
        if (!data) return Response.json({error: 'Round not published.'},{status:403});
      }
      const source = await loadPulseSource(supabase,active.id,roundId);
      const data = buildRoundPulse(source,roundId);
      return Response.json({...data,briefing:copyRoundPulse(data)},{headers:{'Cache-Control':'private, no-store'}});
    }

    const {data: results,error} = await supabase.from('launch_match_results')
      .select('match_id').eq('status','Published');
    if (error) throw error;
    const ids = (results ?? []).map(r=>r.match_id);
    let found: {round_id:string}[] = [];
    for(let start=0;start<ids.length;start+=100) {
      const {data,error:matchError} = await supabase.from('launch_schedule_matches')
        .select('round_id').in('id',ids.slice(start,start+100)).eq('season_id',active.id);
      if(matchError)throw matchError;
      found.push(...((data??[]) as {round_id:string}[]));
    }
    const hasResult = new Set(found.map(m=>m.round_id));
    const available = !isCommissioner
      ? rounds.filter(r=>r.date!==null) : rounds;
    return Response.json({
      rounds:available.map(r=>({id:r.id,number:r.number,label:r.name,date:r.date,
        hasResults:hasResult.has(r.id)})),
      defaultRoundId:available.find(r=>hasResult.has(r.id))?.id ?? available[available.length-1]?.id ?? null,
    },{headers:{'Cache-Control':'private, no-store'}});
  } catch (error) {
    if (error instanceof StoryAccessError) return Response.json({error:error.message},{status:error.status});
    console.error('[round-pulse]', error);
    return Response.json({error:'Round Pulse data is temporarily unavailable.'},{status:500});
  }
}
