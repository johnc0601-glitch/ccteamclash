import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {roundHomeSpreadLine,isSpreadVoteOpen,type SpreadVoteChoice} from './SpreadVote';
import {
  chooseChallengeRound,countChallengeRecord,evaluateClashChoice,
  selectedChallengeTeam,type ChallengeRoundOption,type ChallengeHistoryMatch,
  type ChallengeOutcome,type ClashChallengeSeason,
} from './ClashChallengeHistory';

type Row=Record<string,any>;

function rows(result:Row,label:string):Row[]{
  if(result.error){
    console.error('Clash Challenge season read failed',{label,code:result.error.code});
    throw new Error('Clash Challenge results are temporarily unavailable.');
  }
  return result.data??[];
}

function easternDate(now:Date):string{
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(now);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return values.year+'-'+values.month+'-'+values.day;
}

function validLine(value:unknown):number|null{
  if(value==null)return null;
  const number=Number(value);
  const line=roundHomeSpreadLine(number);
  return line===number&&line!==0?line:null;
}

/** Load just this season's public schedule and private picks for the signed-in visitor. */
export async function loadClashChallengeSeason(
  profileId:string|null,requestedRound:number|null=null,
  now:Date=new Date(),
):Promise<ClashChallengeSeason>{
  const db=createAdminClient() as any;
  const seasonResponse=await db.from('launch_seasons')
    .select('id').eq('active',true).maybeSingle();
  if(seasonResponse.error)throw new Error('Clash Challenge season is temporarily unavailable.');
  if(!seasonResponse.data)return {
    rounds:[],selectedRound:null,activeRound:null,selectedState:null,
    matches:[],roundRecord:countChallengeRecord([]),seasonRecord:countChallengeRecord([]),
  };
  const seasonId=seasonResponse.data.id;
  const [roundResponse,windowResponse,matchResponse,teamResponse]=await Promise.all([
    db.from('launch_rounds').select('id,number,date,published')
      .eq('season_id',seasonId).eq('published',true).order('number'),
    db.from('launch_clash_challenge_windows').select('round_id,opens_at,closes_at'),
    db.from('launch_schedule_matches')
      .select('id,round_id,date,time,status,home_team_id,away_team_id,public_slug')
      .eq('season_id',seasonId),
    db.from('launch_teams').select('id,name,logo'),
  ]);
  const dbRounds=rows(roundResponse,'rounds');
  const windows=rows(windowResponse,'windows');
  const allMatches=rows(matchResponse,'matches').filter((m:Row)=>
    m.home_team_id&&m.away_team_id&&m.date);
  const teamMap=new Map<string,Row>(rows(teamResponse,'teams').map((team:Row)=>[team.id,team]));
  const today=easternDate(now);
  const timestamp=now.getTime();
  const preliminaryOptions:ChallengeRoundOption[]=dbRounds.map((round:Row)=>{
    const window=windows.find((w:Row)=>w.round_id===round.id);
    const opens=window?Date.parse(window.opens_at):NaN;
    const closes=window?Date.parse(window.closes_at):NaN;
    const state=Number.isFinite(opens)&&Number.isFinite(closes)&&opens<closes
      ? timestamp<opens?'future':timestamp>=closes?'past':'active'
      :round.date>=today?'future':'past';
    return {number:round.number,date:round.date,state};
  });
  if(!allMatches.length)return {
    rounds:[],selectedRound:null,activeRound:null,selectedState:null,
    matches:[],roundRecord:countChallengeRecord([]),seasonRecord:countChallengeRecord([]),
  };
  const ids=allMatches.map((m:Row)=>m.id);
  const queries=[
    db.from('launch_match_results')
      .select('match_id,home_score,away_score,status,published_at').in('match_id',ids),
    db.from('launch_match_spread_polls').select('match_id,home_line').in('match_id',ids),
  ];
  if(profileId)queries.push(db.from('launch_match_spread_votes')
    .select('match_id,choice,accepted_home_line').in('match_id',ids).eq('profile_id',profileId));
  const resultSets=await Promise.all(queries);
  const resultMap=new Map<string,Row>(rows(resultSets[0],'results')
    .map((result:Row)=>[result.match_id,result]));
  const pollMap=new Map<string,Row>(rows(resultSets[1],'projections')
    .map((poll:Row)=>[poll.match_id,poll]));
  const voteMap=new Map<string,Row>((resultSets[2]?rows(resultSets[2],'my-picks'):[])
    .map((vote:Row)=>[vote.match_id,vote]));
  // This game began after Round 1 and only one Round 2 match was offered.
  // Do not re-label regular league results as Clash Challenge history.
  // A completed round exists in the game only if at least one matchup has a
  // frozen Challenge projection (or a recorded pick).
  const offeredIds=new Set([...pollMap.keys(),...voteMap.keys()]);
  const options=preliminaryOptions.filter(round=>{
    if(round.state!=='past')return true;
    const roundId=dbRounds.find((r:Row)=>r.number===round.number)?.id;
    return allMatches.some((m:Row)=>m.round_id===roundId&&offeredIds.has(m.id));
  });
  const selectedRound=chooseChallengeRound(options,requestedRound);
  const selectedState=options.find(round=>round.number===selectedRound)?.state??null;
  const activeRound=options.find(round=>round.state==='active')?.number??null;
  if(selectedRound==null)return {
    rounds:options,selectedRound,activeRound,selectedState,
    matches:[],roundRecord:countChallengeRecord([]),seasonRecord:countChallengeRecord([]),
  };
  const selectedRoundId=dbRounds.find((r:Row)=>r.number===selectedRound)?.id;
  const outcomeFor=(m:Row):ChallengeOutcome=>{
    const result=resultMap.get(m.id);
    const vote=voteMap.get(m.id);
    const choice:SpreadVoteChoice|null=vote?.choice==='low'||vote?.choice==='high'
      ?vote.choice:null;
    const published=!!result&&(result.status==='Published'||!!result.published_at)
      &&result.home_score!=null&&result.away_score!=null;
    const scoreHome=published?Number(result.home_score):null;
    const scoreAway=published?Number(result.away_score):null;
    if(!choice&&!pollMap.has(m.id))return published?'not-offered':'no-pick';
    if(!choice)return 'no-pick';
    const line=validLine(vote?.accepted_home_line)??validLine(pollMap.get(m.id)?.home_line);
    return evaluateClashChoice(choice,line,scoreHome,scoreAway);
  };
  const selectedRows=allMatches.filter((m:Row)=>
    m.round_id===selectedRoundId&&(
      // Show the full schedule for upcoming rounds, without exposing lines.
      selectedState==='future'
      // The past only includes matchups where the Challenge was offered.
      ||offeredIds.has(m.id)
      // Newly opened rounds can show a playable match before its line is frozen.
      ||(selectedState==='active'&&isSpreadVoteOpen(m,now))
    ))
    .sort((a:Row,b:Row)=>a.date.localeCompare(b.date)
      ||a.time.localeCompare(b.time)||a.home_team_id.localeCompare(b.home_team_id));
  const matches:ChallengeHistoryMatch[]=selectedRows.map((m:Row)=>{
    const home=teamMap.get(m.home_team_id);
    const away=teamMap.get(m.away_team_id);
    const result=resultMap.get(m.id);
    const vote=voteMap.get(m.id);
    const published=!!result&&(result.status==='Published'||!!result.published_at)
      &&result.home_score!=null&&result.away_score!=null;
    const homeName=home?.name??m.home_team_id;
    const awayName=away?.name??m.away_team_id;
    // Future rounds never transmit projections or saved votes to the browser.
    const homeLine=selectedState==='future'?null:
      validLine(vote?.accepted_home_line)??validLine(pollMap.get(m.id)?.home_line);
    const myChoice:SpreadVoteChoice|null=selectedState==='future'?null:
      vote?.choice==='low'||vote?.choice==='high'?vote.choice:null;
    return {
      matchId:m.id,homeName,awayName,
      homeLogo:home?.logo??'',awayLogo:away?.logo??'',
      date:m.date,time:m.time,
      matchHref:'/matches/'+encodeURIComponent(m.public_slug||m.id),
      homeLine,
      homeScore:published?Number(result.home_score):null,
      awayScore:published?Number(result.away_score):null,
      myChoice,
      selectedTeamName:selectedChallengeTeam(myChoice,homeLine,homeName,awayName),
      outcome:selectedState==='future'?'pending':outcomeFor(m),
    };
  });
  return {
    rounds:options,selectedRound,activeRound,selectedState,matches,
    roundRecord:countChallengeRecord(selectedRows.map(outcomeFor)),
    seasonRecord:countChallengeRecord(allMatches.map(outcomeFor)),
  };
}
