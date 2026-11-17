'use client';

import Link from 'next/link';
import {useMemo,useState,type CSSProperties} from 'react';
import {useFormStatus} from 'react-dom';
import {saveClashChallengeBallot} from './actions';
import {getSpreadCoverOptions,type SpreadVoteChoice} from '@/services/teamStrength/SpreadVote';
import type {ClashChallengeMatch} from '@/services/teamStrength/ClashChallengeBoard';
import styles from './ClashChallenge.module.css';

type Props={matches:ClashChallengeMatch[];canPlay:boolean};

export function ClashChallengePicker({matches,canPlay}:Props) {
  const [chosen,setChosen]=useState<Record<string,SpreadVoteChoice|null>>(
    ()=>Object.fromEntries(matches.map(m=>[m.matchId,m.myChoice]))
  );
  const complete=matches.filter(m=>chosen[m.matchId]!=null).length;
  const changes=useMemo(()=>matches.flatMap(m=>{
    const selected=chosen[m.matchId];
    return selected && selected!==m.myChoice && m.lineToken
      ? [{matchId:m.matchId,choice:selected,lineToken:m.lineToken}] : [];
  }),[chosen,matches]);

  return <form action={saveClashChallengeBallot} className={styles.form}>
    <div className={styles.progressHead}>
      <strong>Your picks</strong>
      <span>{complete} of {matches.length} selected</span>
    </div>
    <div className={styles.progressTrack} role="progressbar" aria-valuemin={0}
      aria-valuemax={matches.length} aria-valuenow={complete} aria-label="Picks selected">
      <div style={{width:(complete/matches.length*100)+'%'}}/>
    </div>
    <div className={styles.matchList}>
      {matches.map((match,index)=>{
        const line=match.homeLine;
        const options=line==null||line===0?null:getSpreadCoverOptions(line,match.homeName,match.awayName);
        const selected=chosen[match.matchId];
        const favoriteSide=line!=null&&line>0?'home':'away';
        const underdogSide=favoriteSide==='home'?'away':'home';
        const optionsWithLook=options?[
          {...options.favorite,side:favoriteSide,
            logo:favoriteSide==='home'?match.homeLogo:match.awayLogo,
            color:favoriteSide==='home'?match.homeColor:match.awayColor},
          {...options.underdog,side:underdogSide,
            logo:underdogSide==='home'?match.homeLogo:match.awayLogo,
            color:underdogSide==='home'?match.homeColor:match.awayColor},
        ]:[];
        const favored=line!=null&&line!==0?(line>0?match.homeName:match.awayName):null;
        return <section key={match.matchId} className={styles.matchCard} data-complete={Boolean(selected)}>
          <div className={styles.matchTop}>
            <span>Matchup {index+1}</span>
            {selected?<span className={styles.pickedMark}>✓ Pick selected</span>:<span>Not picked</span>}
          </div>
          <div className={styles.projection}>
            <span>Fixed match projection</span>
            <strong>{favored?favored+' by '+Math.abs(line!).toFixed(1):'Projection pending'}</strong>
          </div>
          {options? <div className={styles.tiles}>
            {optionsWithLook.map(option=><button key={option.choice} type="button"
              disabled={!canPlay||!match.lineToken}
              className={selected===option.choice?styles.tileSelected:styles.tile}
              style={{'--tile-color':option.color} as CSSProperties}
              aria-pressed={selected===option.choice}
              onClick={()=>setChosen(prev=>({...prev,[match.matchId]:option.choice}))}>
              {selected===option.choice?<span className={styles.selectedCheck} aria-hidden="true">✓</span>:null}
              {option.logo?<img src={option.logo} alt="" className={styles.logo}/>:<span className={styles.logoFallback}>{option.teamName.slice(0,2).toUpperCase()}</span>}
              <strong>{option.teamName}</strong>
              <span className={styles.description}>{option.explanation}</span>
              <span className={styles.tileAction}>{selected===option.choice?'✓ YOUR PICK':'CHOOSE TEAM'}</span>
            </button>)}
          </div>:<p className={styles.unavailable}>The projection is being updated. Picks will be available when it is ready.</p>}
          {match.insights?<MatchupInsights match={match}/>:null}
          <Link className={styles.matchLink} href={match.matchHref}>View match details</Link>
        </section>;
      })}
    </div>
    <input type="hidden" name="ballot" value={JSON.stringify(changes)}/>
    {canPlay?<div className={styles.saveBar}>
      <div className={styles.saveCopy}>
        <strong>{changes.length?changes.length+' unsaved '+(changes.length===1?'pick':'picks'):'Your choices are up to date'}</strong>
        <span>You can return and change picks before each match starts.</span>
      </div>
      <SaveButton disabled={changes.length===0} count={changes.length}/>
    </div>:<div className={styles.signIn}>
      <p>Sign in to make your picks. League registration is not required.</p>
      <Link href="/account">Sign in to play</Link>
    </div>}
    <p className={styles.footnote}>If the final margin exactly matches the projection, neither team beats expectations. Picks are private and close at match start.</p>
  </form>;
}
function MatchupInsights({match}:{match:ClashChallengeMatch}){
  const insights=match.insights;
  if(!insights)return null;
  const displayRecord=(record:{wins:number;losses:number;ties:number})=>
    record.wins+'–'+record.losses+(record.ties?'–'+record.ties:'');
  const displayMargin=(value:number|null,sign:'+'|'−')=>
    value==null?'—':sign+value.toFixed(1);
  const displayScore=(score:number)=>Number.isInteger(score)?String(score):score.toFixed(1);
  const previous=insights.previousMeeting;
  const previousScore=previous
    ?previous.homeScore>previous.awayScore
      ?previous.homeTeamName+' '+displayScore(previous.homeScore)+'–'+displayScore(previous.awayScore)
      :previous.awayScore>previous.homeScore
        ?previous.awayTeamName+' '+displayScore(previous.awayScore)+'–'+displayScore(previous.homeScore)
        :'Tied '+displayScore(previous.homeScore)+'–'+displayScore(previous.awayScore)
    :null;
  return <details className={styles.insights}>
    <summary className={styles.insightsSummary}>
      <strong>Team Stats</strong>
      <span className={styles.insightsChevron} aria-hidden="true">⌄</span>
    </summary>
    <div className={styles.insightsGrid}>
      {([
        ['HOME',match.homeName,insights.home,insights.homeSeason],
        ['AWAY',match.awayName,insights.away,insights.awaySeason],
      ] as const).map(([venue,name,stats,season])=><section key={venue} className={styles.insightTeam}>
        <div className={styles.insightTeamHeading}>
          <strong>{name}</strong>
          <span>{venue} · {displayRecord(stats)}</span>
        </div>
        <div className={styles.insightRow}><span>Avg. win</span><strong>{displayMargin(stats.averageVictoryMargin,'+')}</strong></div>
        <div className={styles.insightRow}><span>Avg. loss</span><strong>{displayMargin(stats.averageDefeatMargin,'−')}</strong></div>
        <div className={styles.insightSeasonHeading}>This Season · {displayRecord(season)}</div>
        <div className={styles.insightResults}>
          {season.results.length?season.results.map((result,index)=><div key={result.playedOn+'-'+index} className={styles.insightResult}>
            <span className={styles.insightOpponent}>{result.venue==='home'?'vs ':'at '}{result.opponent}</span>
            <div className={styles.insightResultScore}>
              <span className={styles.insightResultBadge} data-result={result.result}>{result.result}</span>
              <strong>{displayScore(result.scoreFor)}–{displayScore(result.scoreAgainst)}</strong>
            </div>
          </div>):<span className={styles.insightEmpty}>No results yet</span>}
        </div>
      </section>)}
    </div>
    <div className={styles.insightPrevious}>
      <span>Last head-to-head</span>
      <strong>{previousScore??'No previous meeting'}</strong>
      {previous?<small>{previous.seasonName}</small>:null}
    </div>
    <p className={styles.insightNote}>Home/away averages exclude shortened playoffs. Head-to-head includes playoffs.</p>
  </details>;
}

function SaveButton({disabled,count}:{disabled:boolean;count:number}){
  const {pending}=useFormStatus();
  return <button type="submit" className={styles.saveButton} disabled={disabled||pending}>
    {pending?'Saving…':count?'Save '+count+' '+(count===1?'Pick':'Picks'):'Picks saved'}
  </button>;
}
