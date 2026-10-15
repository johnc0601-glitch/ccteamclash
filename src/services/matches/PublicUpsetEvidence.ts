import 'server-only';
import {createPublicClient} from '@/lib/supabase/public';
import {hasSupabaseConfig} from '@/lib/supabase';
import type {PublishedUpsetContest, PublishedUpsetMatch} from './FinalMatchdayUpsets';

type Fact = {
  contest_id: string; match_id: string; player_name: string; team_id: string;
  side: 'Home' | 'Away'; format: 'Singles' | 'Doubles';
  outcome: 'W' | 'L' | 'T'; win_probability: string | number;
};
type Match = {id: string; date: string; home_team_id: string; away_team_id: string};
type Team = {id: string; name: string};

/** Reads only already-published contest facts via PUBLIC RLS, not the
 * commissioner-only frozen roster or any current rating. This is suitable
 * for public finished match pages as well as the local JSON preview. */
export async function loadPublishedUpsetEvidence(): Promise<PublishedUpsetMatch[]> {
  if (!hasSupabaseConfig()) return [];
  try {
    const db = createPublicClient() as any;
    const {data: published, error: resultError} = await db
      .from('launch_match_results')
      .select('match_id,published_at')
      .eq('status', 'Published')
      .order('published_at', {ascending:false})
      .limit(30);
    if (resultError || !published?.length) return [];
    const ids = [...new Set((published as {match_id:string}[]).map((x)=>x.match_id))];
    const [matchesResponse, factsResponse, teamsResponse] = await Promise.all([
      db.from('launch_schedule_matches').select('id,date,home_team_id,away_team_id').in('id',ids),
      db.from('clash_contest_rating_facts').select('contest_id,match_id,player_name,team_id,side,format,outcome,win_probability').in('match_id',ids),
      db.from('launch_teams').select('id,name').eq('active',true),
    ]);
    if (matchesResponse.error || factsResponse.error || teamsResponse.error) return [];

    const teams = new Map((teamsResponse.data as Team[] ?? []).map(t=>[t.id,t.name]));
    const byMatch = new Map<string, Map<string,Fact[]>>();
    for (const fact of factsResponse.data as Fact[] ?? []) {
      if (!ids.includes(fact.match_id)) continue;
      const groups = byMatch.get(fact.match_id) ?? new Map<string, Fact[]>();
      groups.set(fact.contest_id,[...(groups.get(fact.contest_id) ?? []),fact]);
      byMatch.set(fact.match_id,groups);
    }

    return (matchesResponse.data as Match[] ?? []).flatMap((match): PublishedUpsetMatch[]=>{
      const homeTeamName=teams.get(match.home_team_id);
      const awayTeamName=teams.get(match.away_team_id);
      if(!homeTeamName||!awayTeamName) return [];
      const contests:PublishedUpsetContest[]=[];
      for(const [contestId,facts] of byMatch.get(match.id)??[]) {
        const suffix=/-(singles|doubles)-(\d+)$/i.exec(contestId);
        if(!suffix)continue;
        const format=suffix[1].toLowerCase()==='singles'?'Singles':'Doubles';
        const position=Number(suffix[2]);
        const home=facts.filter(f=>f.side==='Home'&&f.team_id===match.home_team_id);
        const away=facts.filter(f=>f.side==='Away'&&f.team_id===match.away_team_id);
        const perTeam=format==='Singles'?1:2;
        if(home.length!==perTeam||away.length!==perTeam)continue;
        const homeWin=home.every(f=>f.outcome==='W')&&away.every(f=>f.outcome==='L');
        const awayWin=away.every(f=>f.outcome==='W')&&home.every(f=>f.outcome==='L');
        if(!homeWin&&!awayWin)continue;
        const winning=homeWin?home:away;
        const probabilities=winning.map(f=>Number(f.win_probability));
        if(probabilities.some(p=>!Number.isFinite(p)||p<=0||p>=1)
          ||probabilities.some(p=>Math.abs(p-probabilities[0])>.000001))continue;
        contests.push({
          format,position,
          homePlayers:home.map(f=>f.player_name),
          awayPlayers:away.map(f=>f.player_name),
          winner:homeWin?'Home':'Away',
          winningProbability:probabilities[0],
        });
      }
      return [{matchId:match.id,date:match.date,homeTeamName,awayTeamName,contests}];
    });
  }catch{
    return []; // no guessed probabilities or changes to published results
  }
}
