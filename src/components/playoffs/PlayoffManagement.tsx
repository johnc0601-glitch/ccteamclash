'use client';

import {useState} from 'react';
import {PlayoffBracket} from '@/components/playoffs/PlayoffBracket';
import {services} from '@/core/ServiceContainer';
import type {PlayoffBracketView} from '@/domain/playoffs/Playoff';
import type {Match} from '@/domain/schedule/Match';
import styles from './PlayoffManagement.module.css';

export function PlayoffManagement({
  seasonId,
  initialView,
  placeholders,
}: {
  seasonId: string;
  initialView?: PlayoffBracketView;
  placeholders: Match[];
}) {
  const [view, setView] = useState(initialView);
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const defaults = placeholders.slice(0, 3);
  const [sf1, setSf1] = useState(defaults[0]?.id ?? '');
  const [sf2, setSf2] = useState(defaults[1]?.id ?? '');
  const [final, setFinal] = useState(defaults[2]?.id ?? '');

  async function generate() {
    setWorking(true);
    const result = await services.playoffs.generate({
      seasonId,
      semifinal1MatchId: sf1,
      semifinal2MatchId: sf2,
      championshipMatchId: final,
    });
    setWorking(false);
    if (!result.ok) return setMessage(result.message);
    setView(result.data);
    setMessage('Regular season locked and bracket generated.');
  }

  async function publish() {
    setWorking(true);
    const result = await services.playoffs.publish(seasonId);
    setWorking(false);
    if (!result.ok) return setMessage(result.message);
    setView(result.data);
    setMessage('Playoff bracket published.');
  }

  return (
    <div className={styles.workspace}>
      {!view ? (
        <section className={styles.setup}>
          <span>Generate bracket</span>
          <h2>Assign preseason playoff matches</h2>
          <p>Generation is available after every published regular-season match has a final result.</p>
          <div className={styles.selects}>
            <MatchSelect label="Semifinal 1" value={sf1} onChange={setSf1} matches={placeholders} />
            <MatchSelect label="Semifinal 2" value={sf2} onChange={setSf2} matches={placeholders} />
            <MatchSelect label="Championship" value={final} onChange={setFinal} matches={placeholders} />
          </div>
          <button type="button" disabled={working || !sf1 || !sf2 || !final} onClick={() => void generate()}>
            Lock season and generate bracket
          </button>
        </section>
      ) : (
        <>
          <div className={styles.status}>
            <div><span>Bracket status</span><strong>{view.bracket.status}</strong></div>
            {view.bracket.status === 'Draft' ? (
              <button type="button" disabled={working} onClick={() => void publish()}>Publish bracket</button>
            ) : <span>Published bracket</span>}
          </div>
          <PlayoffBracket view={view} />
        </>
      )}
      {message ? <p className={styles.message} role="status">{message}</p> : null}
    </div>
  );
}

function MatchSelect({label, value, onChange, matches}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  matches: Match[];
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select match</option>
        {matches.map((match) => <option value={match.id} key={match.id}>{match.id}</option>)}
      </select>
    </label>
  );
}
