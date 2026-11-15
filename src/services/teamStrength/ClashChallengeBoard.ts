import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {calculateMatchStageStrengthPair} from './PredictionStageStrength';
import {calculateRosterBasedMatchPrediction} from './MatchPrediction';
import {resolvePublicPredictionSource} from './PublicMatchPrediction';
import {roundHomeSpreadLine, type SpreadVoteChoice} from './SpreadVote';
import {signSpreadVoteLine} from './SpreadVoteStore';
import {isClashChallengeVisible} from './ClashChallengeWindows';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';

type Row = Record<string,any>;

export type ClashChallengeMatch = {
  matchId:string;
  homeName:string;
  awayName:string;
  homeLogo:string;
  awayLogo:string;
  homeColor:string;
  awayColor:string;
  date:string;
  time:string;
  homeLine:number|null;
  originalHomeLine:number|null;
  lineToken:string|null;
  myChoice:SpreadVoteChoice|null;
  matchHref:string;
};
export type ClashChallengeBoard = {
  roundNumber:number|null;
  nextOpenAt:string|null;
  matches:ClashChallengeMatch[];
};
function ensureOk(result:Row,label:string):Row[] {
  if(result.error) {
    console.error('Clash Challenge read error',{label,code:result.error.code});
    throw new Error('Clash Challenge is temporarily unavailable.');
  }
  return result.data ?? [];
}
function lineFrom(value:unknown):number|null {
  return value==null ? null : roundHomeSpreadLine(Number(value));
}

/** Batch-load featured matches; never expose another player's selections. */
export async function loadClashChallengeBoard(profileId:string|null):Promise<ClashChallengeBoard> {
  const db=createAdminClient() as any;
  const now=new Date();
  const windows=ensureOk(await db.from('launch_clash_challenge_windows')
    .select('round_id,opens_at,closes_at').order('opens_at'),'windows');
  const featured=windows.find((w:Row)=>Date.parse(w.opens_at)<=now.getTime() && now.getTime()<Date.parse(w.closes_at));
  if(!featured) {
    const next=windows.find((w:Row)=>Date.parse(w.opens_at)>now.getTime());
    return {roundNumber:null,nextOpenAt:next?.opens_at??null,matches:[]};
  }
  const [roundResult,matchResult]=await Promise.all([
    db.from('launch_rounds').select('id,number,published').eq('id',featured.round_id).maybeSingle(),
    db.from('launch_schedule_matches')
      .select('id,round_id,season_id,date,time,status,home_team_id,away_team_id,course_id,public_slug')
      .eq('round_id',featured.round_id),
  ]);
  if(roundResult.error||matchResult.error)throw new Error('Schedule is temporarily unavailable.');
  const round=roundResult.data;
  if(!round?.published)return {roundNumber:null,nextOpenAt:null,matches:[]};
  const activeWindow={opensAt:featured.opens_at,closesAt:featured.closes_at};
  const matches:Row[]=(matchResult.data??[]).filter((m:Row)=>
    m.home_team_id&&m.away_team_id&&m.date&&m.time&&isClashChallengeVisible(m as {date:string;time:string;status:string},activeWindow,false,now));
  if(!matches.length)return {roundNumber:round.number,nextOpenAt:null,matches:[]};
  const ids=matches.map(m=>m.id);
  const teamIds=[...new Set<string>(matches.flatMap(m=>[m.home_team_id,m.away_team_id]))];
  const courseIds=[...new Set<string>(matches.map(m=>m.course_id).filter(Boolean))];
  const seasonId=matches[0].season_id;

  const operations=[
    db.from('launch_teams').select('id,name,logo,primary_color').in('id',teamIds),
    db.from('launch_courses').select('id,home_team_id').in('id',courseIds),
    db.from('launch_season_roster_memberships').select('team_id,player_id')
      .eq('season_id',seasonId).eq('status','Active').in('team_id',teamIds),
    db.from('launch_match_roster_loans').select('match_id,borrowing_team_id,player_id')
      .in('match_id',ids).is('removed_at',null),
    db.from('launch_match_attendance').select('match_id,team_id,player_id,status').in('match_id',ids),
    db.from('launch_match_roster_snapshot_players').select('match_id,team_id,player_id').in('match_id',ids),
    db.from('launch_match_spread_polls').select('match_id,home_line,current_home_line').in('match_id',ids),
    db.from('launch_match_results').select('match_id,status,published_at').in('match_id',ids),
    db.from('launch_match_final_snapshots').select('match_id,locked').in('match_id',ids),
  ];
  if(profileId)operations.push(db.from('launch_match_spread_votes')
    .select('match_id,choice').in('match_id',ids).eq('profile_id',profileId));
  const resolved=await Promise.all(operations);
  const [teams,courses,memberships,loans,attendance,snapshots,polls,results,finals,votes]=
    resolved.map((result,i)=>ensureOk(result,'batch-'+i));
  const teamMap=new Map<string,Row>(teams.map((t:Row)=>[t.id,t]));
  const courseMap=new Map<string,Row>(courses.map((t:Row)=>[t.id,t]));
  const pollMap=new Map<string,Row>(polls.map((t:Row)=>[t.match_id,t]));
  const voteMap=new Map<string,Row>((votes??[]).map((t:Row)=>[t.match_id,t]));
  const finalized=new Set<string>([
    ...results.filter((r:Row)=>r.status==='Published'||r.published_at).map((r:Row)=>r.match_id),
    ...finals.filter((r:Row)=>r.locked).map((r:Row)=>r.match_id),
  ]);
  const playerIds=[...new Set<string>([...memberships,...loans].map((r:Row)=>r.player_id))];
  const playerData=playerIds.length
    ? ensureOk(await db.from('launch_players')
        .select('id,name,gender,pdga_number,pdga_rating,clash_index,clash_index_provisional,current_team_id,home_area,active,created_at,updated_at')
        .in('id',playerIds),'players')
    : [];
  const playerMap=new Map<string,LaunchPlayer>(playerData.map((p:Row)=>[p.id,{
    id:p.id,name:p.name,gender:p.gender,pdgaNumber:p.pdga_number,
    pdgaRating:p.pdga_rating,clashIndex:p.clash_index,clashIndexProvisional:p.clash_index_provisional===true,
    currentTeamId:p.current_team_id,homeArea:p.home_area,active:p.active,createdAt:p.created_at,updatedAt:p.updated_at,
  } as LaunchPlayer]));
  const cards:ClashChallengeMatch[]=[];
  for(const m of matches) {
    if(finalized.has(m.id))continue;
    const home=teamMap.get(m.home_team_id),away=teamMap.get(m.away_team_id);
    if(!home||!away)continue;
    const teamPlayers=(teamId:string):LaunchPlayer[]=>{
      const set=new Set<string>(memberships.filter((r:Row)=>r.team_id===teamId).map((r:Row)=>r.player_id));
      for(const r of loans) if(r.match_id===m.id && r.borrowing_team_id===teamId)set.add(r.player_id);
      return [...set].map(id=>playerMap.get(id)).filter((p):p is LaunchPlayer=>Boolean(p));
    };
    const attending=(teamId:string):TeamAttendanceMember[]=>attendance
      .filter((a:Row)=>a.match_id===m.id&&a.team_id===teamId)
      .map((a:Row)=>({playerId:a.player_id,playerName:playerMap.get(a.player_id)?.name??'',teamId,status:a.status}));
    const official=[home,away].map(t=>({
      teamId:t.id,players:snapshots.filter((s:Row)=>s.match_id===m.id&&s.team_id===t.id)
        .map((s:Row)=>({playerId:s.player_id})),
    })) as unknown as OfficialMatchRoster[];
    const stage=resolvePublicPredictionSource(m.date,now);
    const strengths=stage?calculateMatchStageStrengthPair({
      source:stage,homeTeamId:home.id,awayTeamId:away.id,
      homePlayers:teamPlayers(home.id),awayPlayers:teamPlayers(away.id),
      homeAttendance:attending(home.id),awayAttendance:attending(away.id),
      officialRosters:official.every(r=>r.players.length>0)?official:undefined,
    }):undefined;
    const estimate=strengths?calculateRosterBasedMatchPrediction({
      team:strengths.home,opponent:strengths.away,
      venue:courseMap.get(m.course_id)?.home_team_id===home.id?'Home':'Neutral',
    }):undefined;
    const computed=estimate&&estimate.readiness!=='Unavailable'
      ?roundHomeSpreadLine(estimate.expectedPointMargin):null;
    const poll=pollMap.get(m.id);
    const homeLine=poll?lineFrom(poll.current_home_line):computed;
    const storedChoice=voteMap.get(m.id)?.choice;
    cards.push({
      matchId:m.id,homeName:home.name,awayName:away.name,
      homeLogo:home.logo??'',awayLogo:away.logo??'',
      homeColor:home.primary_color??'#a54a79',awayColor:away.primary_color??'#397bb8',
      date:m.date,time:m.time,homeLine,
      originalHomeLine:poll?lineFrom(poll.home_line):null,
      lineToken:profileId&&homeLine!=null&&homeLine!==0?signSpreadVoteLine(m.id,homeLine):null,
      myChoice:storedChoice==='low'||storedChoice==='high'?storedChoice:null,
      matchHref:'/matches/'+encodeURIComponent(m.public_slug||m.id),
    });
  }
  cards.sort((a,b)=>a.homeName.localeCompare(b.homeName));
  return {roundNumber:round.number,nextOpenAt:null,matches:cards};
}
