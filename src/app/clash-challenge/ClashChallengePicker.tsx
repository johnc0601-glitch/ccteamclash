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
        return <section key={match.matchId} className={styles.matchCard}>
          <div className={styles.matchTop}>
            <span>Matchup {index+1}</span>
            {selected?<span className={styles.pickedMark}>✓ Pick selected</span>:<span>Not picked</span>}
          </div>
          <div className={styles.projection}>
            <span>Projected match result</span>
            <strong>{favored?favored+' by '+Math.abs(line!).toFixed(1):'Projection pending'}</strong>
            {match.originalHomeLine!=null&&match.originalHomeLine!==line
              ? <small>Original projection: {match.originalHomeLine>0?match.homeName:match.awayName} by {Math.abs(match.originalHomeLine).toFixed(1)}</small> : null}
          </div>
          {options? <div className={styles.tiles}>
            {optionsWithLook.map(option=><button key={option.choice} type="button"
              disabled={!canPlay||!match.lineToken}
              className={selected===option.choice?styles.tileSelected:styles.tile}
              style={{'--tile-color':option.color} as CSSProperties}
              aria-pressed={selected===option.choice}
              onClick={()=>setChosen(prev=>({...prev,[match.matchId]:option.choice}))}>
              {option.logo?<img src={option.logo} alt="" className={styles.logo}/>:<span className={styles.logoFallback}>{option.teamName.slice(0,2).toUpperCase()}</span>}
              <strong>{option.teamName}</strong>
              <span className={styles.description}>{option.explanation}</span>
              <span className={styles.tileAction}>{selected===option.choice?'✓ YOUR PICK':'CHOOSE TEAM'}</span>
            </button>)}
          </div>:<p className={styles.unavailable}>The projection is being updated. Picks will be available when it is ready.</p>}
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
      <p>Registered, approved players must be signed in to save picks.</p>
      <Link href="/account">Sign in or register to play</Link>
    </div>}
    <p className={styles.footnote}>If the final margin exactly matches the projection, neither team beats expectations. Picks are private and close at match start.</p>
  </form>;
}
function SaveButton({disabled,count}:{disabled:boolean;count:number}){
  const {pending}=useFormStatus();
  return <button type="submit" className={styles.saveButton} disabled={disabled||pending}>
    {pending?'Saving…':count?'Save '+count+' '+(count===1?'Pick':'Picks'):'Save Picks'}
  </button>;
}
