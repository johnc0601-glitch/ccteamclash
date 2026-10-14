'use client';

import {useState} from 'react';
import type {FinalMatchdaySnapshot} from '@/services/matches/FinalMatchdaySnapshot';
import {parseScoreboardPreviewJson} from '@/services/matches/ScoreboardPreviewParser';
import {FinalMatchday} from './FinalMatchday';

const MAX_FILE_BYTES = 2_000_000;

function samplePreview(): FinalMatchdaySnapshot {
  return {
    matchId:'illustration-only',
    date:'2026-10-10',
    time:'10:00',
    roundNumber:1,
    course:{id:'demo',name:'Example course',mapUrl:null},
    awayTeam:{id:'demo-away',name:'Away Team (sample)',shortName:'AWAY',logo:'',primaryColor:'#2e6080',secondaryColor:null},
    homeTeam:{id:'demo-home',name:'Home Team (sample)',shortName:'HOME',logo:'',primaryColor:'#7a2441',secondaryColor:null},
    awayScore:0.5,homeScore:5,
    contests:[
      {id:'sample-s1',format:'Singles',position:1,homeOutcome:'W',awayOutcome:'L',
        homePlayers:[{id:'hp1',name:'Sample Player One'}],
        awayPlayers:[{id:'ap1',name:'Sample Player Two'}]},
      {id:'sample-s2',format:'Singles',position:2,homeOutcome:'T',awayOutcome:'T',
        homePlayers:[{id:'hp2',name:'Sample Player Three'}],
        awayPlayers:[{id:'ap2',name:'Sample Player Four'}]},
      {id:'sample-s3',format:'Singles',position:3,homeOutcome:'T',awayOutcome:'T',unplayed:true,
        homePlayers:[{id:'hp3',name:'Sample Player Five'}],awayPlayers:[]},
      {id:'sample-d1',format:'Doubles',position:1,homeOutcome:'W',awayOutcome:'L',
        homePlayers:[{id:'hp1',name:'Sample Player One'},{id:'hp2',name:'Sample Player Three'}],
        awayPlayers:[{id:'ap1',name:'Sample Player Two'},{id:'ap2',name:'Sample Player Four'}]},
    ],
    adjustments:[
      {awardedTeamId:'demo-home',category:'UnplayedSlot',points:1,note:'Sample unplayed position: no player win/loss or CI movement'},
      {awardedTeamId:'demo-home',category:'NoShow',points:.5,note:'Sample rostered absence'},
    ],
    weather:null,publishedAt:null,
  };
}

export function ScoreboardPreviewClient() {
  const [snapshot, setSnapshot] = useState<FinalMatchdaySnapshot | null>(null);
  const [sourceLabel, setSourceLabel] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadLocalFile(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    setError('');
    setNotes([]);
    setSnapshot(null);
    setSourceLabel('');
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('Select a JSON file smaller than 2 MB.');
      const parsed: unknown = JSON.parse(await file.text());
      const preview = parseScoreboardPreviewJson(parsed);
      setSnapshot(preview.snapshot);
      setNotes(preview.notes);
      setSourceLabel(file.name);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The file could not be read.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#090d11',color:'#edf0f3'}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'28px 16px 22px'}}>
        <p style={{fontSize:11,textTransform:'uppercase',letterSpacing:'.15em',color:'#b9c1cb',margin:'0 0 7px'}}>
          CCTeamClash · Scoreboard design review
        </p>
        <h1 style={{fontSize:'clamp(23px,4vw,34px)',fontWeight:900,lineHeight:1.15,margin:'0 0 12px'}}>
          Final Matchday Preview
        </h1>
        <p style={{maxWidth:730,fontSize:14,lineHeight:1.6,color:'#c9d0d7',margin:'0 0 18px'}}>
          Open a match-results JSON file directly from your device. No commissioner login is
          needed. The file is processed in your browser only: it is not uploaded, imported,
          saved to Supabase, or used to update standings or CI.
        </p>
        <div style={{
          display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',padding:'16px',
          border:'1px solid rgba(255,255,255,.2)',borderRadius:12,background:'#18212b',
        }}>
          <label style={{display:'grid',gap:7,fontSize:13,fontWeight:700}}>
            <span>Choose match JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              disabled={loading}
              onChange={(event) => {void loadLocalFile(event.currentTarget.files?.[0]);}}
              style={{maxWidth:'min(330px,85vw)',fontSize:12,color:'#e8edf2'}}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setSnapshot(samplePreview());
              setSourceLabel('Illustration only — not an actual match result');
              setError('');
              setNotes([]);
            }}
            style={{
              border:'1px solid rgba(255,255,255,.3)',borderRadius:7,padding:'10px 14px',
              background:'#26374a',color:'white',fontSize:12,cursor:'pointer',
            }}
          >
            See sample layout
          </button>
        </div>
        {error ? (
          <p role="alert" style={{padding:'12px',border:'1px solid #b76868',borderRadius:8,color:'#ffd4d4',fontSize:13}}>
            {error} No results have been changed.
          </p>
        ) : null}
        {loading ? <p role="status">Reading file locally…</p> : null}
        {sourceLabel ? (
          <div style={{marginTop:14,padding:'11px 13px',borderLeft:'3px solid #c8ad75',background:'#1a2229',fontSize:13}}>
            <strong>Preview source:</strong> {sourceLabel}
            <div style={{marginTop:5,color:'#c5cdd5'}}>
              Display only · no import · scores shown exactly as supplied
            </div>
          </div>
        ) : null}
        {notes.map((note,i) => <p key={i} style={{fontSize:12,color:'#f1c881'}}>{note}</p>)}
      </div>
      {snapshot ? (
        <FinalMatchday snapshot={snapshot}/>
      ) : (
        <div style={{maxWidth:1100,margin:'0 auto',padding:'20px 16px 60px',color:'#b9c1cb',fontSize:14}}>
          Select the full match-results JSON above to view its final-scoreboard layout, or
          use the sample button to see how an unplayed position and penalties appear.
        </div>
      )}
      <footer style={{maxWidth:1100,margin:'0 auto',padding:'20px 16px 40px',fontSize:12,color:'#97a0a9'}}>
        Preview route only. The production Commissioner Results editor and its access controls are unchanged.
      </footer>
    </div>
  );
}
