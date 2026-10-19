'use client';

import {useEffect, useState} from 'react';
import type {PulseRound, SavedPulseFact} from '@/services/pulse/PulseFacts';
import {copyRecapText, RECAP_CATEGORIES, selectRecapFacts} from '@/services/pulse/PulseRecap';
import styles from './AroundTheClashDesk.module.css';

type Library = {facts: SavedPulseFact[]; queued?: boolean; generation: {complete: boolean; finalized: number; scheduled: number; warnings: string[]} | null};
async function request(round: PulseRound, generate: boolean, signal?: AbortSignal): Promise<Library> {
  const response = await fetch(`/api/clash-pulse/library${generate ? '' : `?round=${encodeURIComponent(round.id)}`}`, {
    method: generate ? 'POST' : 'GET', cache: 'no-store', signal,
    ...(generate ? {headers: {'Content-Type':'application/json'}, body: JSON.stringify({action:'generate',seasonId:round.season_id,roundId:round.id})} : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not load recap facts.');
  return data;
}

export function RoundRecapFacts({round, seasonLabel}: {round: PulseRound; seasonLabel: string}) {
  const [library,setLibrary] = useState<Library | null>(null);
  const [busy,setBusy] = useState(true);
  const [message,setMessage] = useState('');
  const [category,setCategory] = useState('Round');
  const [report,setReport] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    request(round,false,controller.signal).then(data => {
      setLibrary(data); setBusy(false);
    }).catch(error => {if (!controller.signal.aborted) {setMessage(error.message); setBusy(false);}});
    return () => controller.abort();
  },[round]);
  async function refresh() {
    setBusy(true); setMessage(''); setReport('');
    try {setLibrary(await request(round,true)); setMessage('Recap facts ready.');}
    catch (error) {setMessage(error instanceof Error ? error.message : 'Could not refresh recap facts.');}
    finally {setBusy(false);}
  }
  const facts = selectRecapFacts(library?.facts ?? []);
  const notes = [...(library?.generation?.warnings ?? []),...(!library?.generation?.complete ? ['Partial round: some results or player statistics are not finalized.'] : [])];
  async function copy() {
    const text = copyRecapText(`${seasonLabel} — Round ${round.number}`,facts,notes);
    setReport(text);
    try {await navigator.clipboard.writeText(text);setMessage('Recap facts copied.');}
    catch {setMessage('Select and copy the report in the preview below.');}
  }
  return <section className={styles.factPanel} aria-label={`Round ${round.number} Facts`}>
    <header className={styles.factHeader}><h3>Round {round.number} Facts</h3><span>{seasonLabel} · Top 10 per category</span></header>
    <div className={styles.contextRow}>
      <button className={styles.contextButton} disabled={busy} onClick={refresh}>{busy ? 'Loading…' : library?.generation ? 'Refresh recap facts' : 'Generate recap facts'}</button>
      <button className={styles.contextButton} disabled={busy || library?.queued || !facts.length} onClick={copy}>Copy Recap Facts</button>
    </div>
    <p role="status">{message}</p>
    {library?.queued && <p>Results changed. Refresh recap facts before copying.</p>}
    {library?.generation && <details><summary>Coverage and source notes · {library.generation.finalized}/{library.generation.scheduled} finalized</summary>{notes.map(note => <p key={note}>{note}</p>)}</details>}
    <nav className={styles.categoryRow} aria-label="Round recap categories">
      {RECAP_CATEGORIES.map(item => <button key={item} className={styles.filterButton} aria-pressed={category === item} onClick={() => setCategory(item)}>{item} {facts.filter(f => f.category === item).length}</button>)}
    </nav>
    <div className={styles.factList}>{facts.filter(f => f.category === category).map(f => <article key={f.id} className={styles.recapCard}>
      <strong>{f.fact_text}</strong><details><summary>Source and calculation</summary><p>{f.calculation}</p>{f.sources.map(s => <p key={s.table}>{s.table}: {s.ids.join(', ')}</p>)}</details>
    </article>)}</div>
    {!busy && !facts.some(f => f.category === category) && <p className={styles.queueEmpty}>{library?.generation ? 'No qualifying facts in this category for this round.' : 'Generate this round’s recap facts to begin.'}</p>}
    {report && <details><summary>Recap report preview</summary><textarea className={styles.recapReport} aria-label="Recap report" readOnly rows={12} value={report} onFocus={e => e.target.select()} /></details>}
  </section>;
}
