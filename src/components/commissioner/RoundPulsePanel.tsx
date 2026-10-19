'use client';

import {useEffect,useState} from 'react';
import type {RoundPulseData} from '@/services/pulse/RoundPulseService';
import styles from './RoundPulsePanel.module.css';

type Choice = {id:string;number:number;label:string;date:string|null;hasResults:boolean};
type RoundOptions = {rounds:Choice[];defaultRoundId:string|null};
type RoundResult = RoundPulseData & {briefing:string};

const number = (n:number)=>Number.isInteger(n)?String(n):n.toFixed(1);
const signed = (n:number)=>`${n>0?'+':''}${number(n)}`;
const percentage = (n:number)=>(100*n).toFixed(1)+'%';

export function RoundPulsePanel() {
  const [options,setOptions]=useState<Choice[]>([]);
  const [roundId,setRoundId]=useState('');
  const [data,setData]=useState<RoundResult|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [copyState,setCopyState]=useState('');

  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/clash-pulse/round-pulse',{signal:controller.signal,cache:'no-store'})
      .then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error??'Round options unavailable');return body as RoundOptions;})
      .then(result=>{if(controller.signal.aborted)return;setOptions(result.rounds);setRoundId(result.defaultRoundId??'');
        if(!result.defaultRoundId)setLoading(false);})
      .catch(e=>{if(!controller.signal.aborted){setError(e instanceof Error?e.message:'Round options unavailable');setLoading(false);}});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(!roundId)return;
    const controller=new AbortController();
    setLoading(true);setData(null);setError('');setCopyState('');
    fetch('/api/clash-pulse/round-pulse?round='+encodeURIComponent(roundId),{signal:controller.signal,cache:'no-store'})
      .then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error??'Round statistics unavailable');return body as RoundResult;})
      .then(result=>{if(!controller.signal.aborted)setData(result);})
      .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Round statistics unavailable');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[roundId]);
  async function copy(){
    if(!data)return;
    try{await navigator.clipboard.writeText(data.briefing);setCopyState('Round summary copied for Clash Cast or a recap.');}
    catch{setCopyState('Clipboard unavailable; select the summary below.');}
  }

  const big=data?.biggest, close=data?.closest;
  return <section className={styles.panel} aria-label="Round Pulse league-wide statistics">
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>League-wide round statistics</p>
        <h2>Round Pulse</h2>
        <p className={styles.subheading}>Four matches. One league-wide story. Only published results and verified player statistics.</p>
      </div>
      <label className={styles.roundSelect}>Round
        <select value={roundId} onChange={e=>setRoundId(e.target.value)} disabled={!options.length}>
          {options.map(r=><option key={r.id} value={r.id}>Round {r.number}{r.hasResults?' · Results available':''}</option>)}
        </select>
      </label>
    </header>
    {loading&&<p className={styles.status} role="status">Loading league-wide round statistics…</p>}
    {error&&<p className={styles.status} role="alert">{error}</p>}
    {!loading&&!error&&!data&&<p className={styles.status}>No published round statistics are available yet.</p>}
    {data&&<>
      <div className={styles.coverage} role="status">
        <strong>{data.finalized} of {data.scheduled} matches finalized</strong>
        <span>{data.complete?'All team finals published':'Partial results — totals are not yet final'}</span>
        {data.complete&&!data.verified&&<span>Player/CI facts awaiting full verification</span>}
      </div>
      <div className={styles.highlights}>
        <div className={styles.highlight}>
          <span>Biggest victory</span>
          <strong>{big?(big.winner??'Tie'):'Pending'}</strong>
          <small>{big?`${number(big.margin)}-point margin · ${big.away} at ${big.home}`:'No final scores yet'}</small>
        </div>
        <div className={styles.highlight}>
          <span>Closest clash</span>
          <strong>{close?`${close.away} at ${close.home}`:'Pending'}</strong>
          <small>{close?`${number(close.margin)}-point margin`:'No final scores yet'}</small>
        </div>
        <div className={styles.highlight}>
          <span>Largest CI gain</span>
          <strong>{data.verified?data.topGainers[0]?.name??'None':'Pending verification'}</strong>
          <small>{data.verified&&data.topGainers[0]?`${signed(data.topGainers[0].change)} CI · ${data.topGainers[0].team}`:'Only verified played results'}</small>
        </div>
        <div className={styles.highlight}>
          <span>Biggest individual upset</span>
          <strong>{data.verified?data.biggestUpset?.winner??'None':'Pending verification'}</strong>
          <small>{data.verified&&data.biggestUpset?`${percentage(data.biggestUpset.probability)} pre-match win chance`:'Frozen odds required'}</small>
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" disabled={!data.finalized} onClick={copy}>Copy Round Summary</button>
        <span>{data.verified?'Verified player facts':'Team finals available; player totals gated by verification'}</span>
      </div>
      {copyState&&<p className={styles.status} role="status">{copyState}</p>}
      {copyState.startsWith('Clipboard unavailable')&&<textarea className={styles.copyFallback} readOnly rows={10} value={data.briefing} onFocus={e=>e.target.select()} aria-label="Select and copy Round Pulse summary"/>}
      <div className={styles.details}>
        <details open>
          <summary>Round results <span>{data.homeWins} home · {data.awayWins} away · {data.ties} ties</span></summary>
          <div className={styles.content}>
            {data.matches.map(m=><p key={m.matchId}>
              <strong>{m.away} {number(m.awayScore)} – {number(m.homeScore)} {m.home}</strong>
              <small>{m.winner?`${m.winner} by ${number(m.margin)}`:'Tied'}</small>
            </p>)}
            {!data.matches.length&&<p>No completed matches this round.</p>}
          </div>
        </details>
        <details>
          <summary>League numbers <span>{data.verified?`${data.players} players · ${(data.singles??0)+(data.doubles??0)} contests`:'Results pending verification'}</span></summary>
          <div className={styles.content}>
            <p>Unique verified players: <strong>{data.players??'Pending'}</strong></p>
            <p>Played singles: <strong>{data.singles??'Pending'}</strong> · Played doubles: <strong>{data.doubles??'Pending'}</strong></p>
            {data.points?<>
              <p>Published team points: <strong>{number(data.points.published)}</strong></p>
              <p>Played singles points: <strong>{number(data.points.playedSingles)}</strong> · Played doubles points: <strong>{number(data.points.playedDoubles)}</strong></p>
              <p>Extra team awards: <strong>{number(data.points.awarded)}</strong> (no-show/penalty {number(data.points.rosterNoShow)}, women's bonus {number(data.points.womenBonus)}, other {number(data.points.other)})</p>
              {Math.abs(data.points.unitemized)>.001&&<p>Unitemized points requiring review: {number(data.points.unitemized)}</p>}
            </>:<p>Published points breakdown pending locked scoreboards.</p>}
          </div>
        </details>
        <details>
          <summary>CI movement <span>{data.verified?'Top gainers and decliners':'Pending verification'}</span></summary>
          <div className={styles.content}>
            {data.verified?<>
              <strong>Top CI gains</strong>
              {data.topGainers.length?data.topGainers.map(p=><p key={p.playerId}>{p.name} ({p.team}) <strong>{signed(p.change)}</strong></p>):<p>No positive changes.</p>}
              <strong>Largest CI declines</strong>
              {data.topDecliners.length?data.topDecliners.map(p=><p key={p.playerId}>{p.name} ({p.team}) <strong>{signed(p.change)}</strong></p>):<p>No negative changes.</p>}
              {!!data.positiveByTeam.length&&<p>Most improving players: <strong>{data.positiveByTeam[0].team}</strong> ({data.positiveByTeam[0].players})</p>}
            </>:<p>Current CI and predictions are never substituted for missing frozen round data.</p>}
          </div>
        </details>
        <details>
          <summary>Upsets and formats <span>{data.verified?`${data.upsetCount} underdog contests · ${data.upsetRate}%`:'Pending verification'}</span></summary>
          <div className={styles.content}>
            {data.verified?<>
              <p>Underdog wins: <strong>{data.upsetCount}</strong> out of {(data.singles??0)+(data.doubles??0)} played contests ({data.upsetRate}%). Doubles partnerships count once.</p>
              {data.biggestUpset&&<p>Biggest: <strong>{data.biggestUpset.winner}</strong> over {data.biggestUpset.loser} ({percentage(data.biggestUpset.probability)} chance).</p>}
              {data.formatLeaders.map(f=><p key={f.format+f.team}>{f.format} leader: <strong>{f.team}</strong> · {number(f.points)}/{f.played} ({f.pct}%) played points</p>)}
              {data.teamUpsets.length?data.teamUpsets.map(t=><p key={t.team}>Verified team upset: <strong>{t.team}</strong> over {t.opponent} ({percentage(t.winChance)} saved chance)</p>):<p>No team-upset claim without a saved verified roster-lock forecast.</p>}
            </>:<p>Only fully reconciled contests with frozen pre-match probabilities qualify.</p>}
          </div>
        </details>
      </div>
      {!!data.warnings.length&&<details className={styles.warnings}><summary>Data and coverage notes ({data.warnings.length})</summary>{data.warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
    </>}
  </section>;
}
