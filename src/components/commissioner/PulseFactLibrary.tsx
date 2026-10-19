'use client';

import {useEffect, useState} from 'react';
import {exportRoundFacts, type PulseCategory, type PulseRound, type SavedPulseFact} from '@/services/pulse/PulseFacts';
import styles from './PulseFactLibrary.module.css';

type Options = {seasons: {id: string; name: string; active: boolean}[]; rounds: PulseRound[]};
type Library = {facts: SavedPulseFact[]; queued?: boolean; generation: {complete: boolean; finalized: number; scheduled: number; warnings: string[]; generated_at: string} | null};
const categories: PulseCategory[] = ['Match','Upsets','CI movement','Achievements','Round','Streaks','History','Upcoming','Editorial'];
async function api(path = '', init?: RequestInit) {
  const response = await fetch(`/api/clash-pulse/library${path}`, {...init, cache: 'no-store'});
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Fact library request failed.');
  return body;
}
export function PulseFactLibrary() {
  const [options, setOptions] = useState<Options>({seasons: [], rounds: []});
  const [seasonId, setSeasonId] = useState('');
  const [roundId, setRoundId] = useState('');
  const [library, setLibrary] = useState<Library>({facts: [], generation: null});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editorial, setEditorial] = useState('');
  const [filter, setFilter] = useState('All');
  const [exportText, setExportText] = useState('');
  const [copyFallback, setCopyFallback] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api('', {signal: controller.signal}).then((data: Options) => {
      setOptions(data);
      const season = data.seasons.find(s => s.active) ?? data.seasons[0];
      setSeasonId(season?.id ?? '');
      setRoundId(data.rounds.find(r => r.season_id === season?.id)?.id ?? '');
      if (!season) setLoading(false);
    }).catch(e => {if (!controller.signal.aborted) {setError(e.message); setLoading(false);}});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!roundId) return;
    const controller = new AbortController();
    api(`?round=${encodeURIComponent(roundId)}`, {signal: controller.signal}).then((data: Library) => {
      setLibrary(data); setLoading(false);
    }).catch(e => {if (!controller.signal.aborted) {setError(e.message); setLoading(false);}});
    return () => controller.abort();
  }, [roundId]);
  function selectRound(id: string) {
    setRoundId(id); setLibrary({facts: [], generation: null}); setLoading(Boolean(id)); setError(''); setNotice(''); setExportText('');
  }
  async function mutate(method: string, body: Record<string, string>) {
    setBusy(true); setError(''); setNotice(''); setExportText('');
    try {
      await api('', {method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...body, seasonId, roundId})});
      setLibrary(await api(`?round=${encodeURIComponent(roundId)}`));
      if (body.action === 'editorial') setEditorial('');
      setNotice(body.action === 'generate' ? 'Recap facts ready. Copy the round report whenever you need it.' : 'Saved.');
    } catch (e) {setError(e instanceof Error ? e.message : 'Save failed.');}
    finally {setBusy(false);}
  }
  const seasonRounds = options.rounds.filter(r => r.season_id === seasonId);
  const round = seasonRounds.find(r => r.id === roundId);
  async function copy() {
    const text = exportRoundFacts(`${options.seasons.find(s => s.id === seasonId)?.name} — Round ${round?.number}`,
      library.facts, [...(library.generation?.warnings ?? []), ...(!library.generation?.complete ? ['Round analysis is incomplete.'] : [])]);
    setExportText(text);
    setCopyFallback(false);
    try {await navigator.clipboard.writeText(text); setNotice('Round facts copied.');}
    catch {setCopyFallback(true); setNotice('Select and copy the report below.');}
  }
  return <section className={styles.library} aria-labelledby="pulse-library-title">
    <div><h2 id="pulse-library-title">Monthly recap facts</h2><p>Generate the round’s statistics, streaks and historical context, then copy them into your recap notes. No approval needed.</p></div>
    <div className={styles.toolbar}>
      <label className={styles.field}>Season<select value={seasonId} disabled={busy || !options.seasons.length} onChange={e => {
        setSeasonId(e.target.value); selectRound(options.rounds.find(r => r.season_id === e.target.value)?.id ?? '');
      }}>{options.seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className={styles.field}>Round<select value={roundId} disabled={busy || !seasonRounds.length} onChange={e => selectRound(e.target.value)}>
        {!seasonRounds.length && <option value="">No scheduled rounds</option>}
        {seasonRounds.map(r => <option key={r.id} value={r.id}>Round {r.number}{r.date ? ` · ${r.date}` : ''}</option>)}</select></label>
      <button disabled={busy || !roundId || loading} onClick={() => mutate('POST', {action: 'generate'})}>{busy ? 'Saving…' : 'Generate / refresh facts'}</button>
      <button className={styles.primary} disabled={busy || loading || library.queued || !library.facts.length} onClick={copy}>Copy Round Facts</button>
    </div>
    <div role="status" aria-live="polite">{loading ? 'Loading fact library…' : notice}</div>
    {error && <p role="alert" className={styles.notice}>{error}</p>}
    {library.queued && <p className={styles.notice}>Source results changed. Refresh facts before copying the report.</p>}
    {!loading && library.generation && <div className={styles.notice}>
      <strong>{library.generation.complete ? 'Complete round analysis' : 'Partial round analysis'}</strong> · {library.generation.finalized}/{library.generation.scheduled} finalized · Generated {new Date(library.generation.generated_at).toLocaleString()}
      {library.generation.warnings.map(w => <p key={w}>{w}</p>)}
    </div>}
    {!loading && !library.facts.length && <p>No saved facts for this round. Generate facts when published results are available.</p>}
    <label className={styles.field}>View<select value={filter} onChange={e => setFilter(e.target.value)}>
      {['All',...categories].map(c => <option key={c}>{c}</option>)}</select></label>
    {categories.filter(c => filter === 'All' || filter === c).map(category => {
      const rows = library.facts.filter(f => f.category === category && f.status !== 'hidden');
      if (!rows.length && category === 'Streaks' && library.generation) return <section key={category} aria-label={category}><h3>Streaks</h3><p>No qualifying streaks or broken streaks of at least two results in this round’s verified season records.</p></section>;
      if (!rows.length) return null;
      return <section key={category} aria-label={category}><h3>{category} ({rows.length})</h3>{rows.map(f => <article className={styles.fact} key={f.id}>
        <div className={styles.meta}>{f.origin === 'editorial' ? 'Commissioner supplied' : 'Calculated from source records'}</div>
        <p>{f.fact_text}</p>
        <details className={styles.details}><summary>Source and calculation</summary><p>{f.calculation}</p>
          <ul>{f.sources.map((s,i) => <li key={i}><strong>{s.table}</strong>: {s.ids.join(', ')}</li>)}</ul>
          <p>Generated {new Date(f.generated_at).toLocaleString()}</p>
        </details>
      </article>)}</section>;
    })}
    <form className={styles.editorial} onSubmit={e => {e.preventDefault(); void mutate('POST', {action: 'editorial', text: editorial});}}>
      <label htmlFor="pulse-editorial">Add an editorial fact</label>
      <textarea id="pulse-editorial" value={editorial} maxLength={4000} onChange={e => setEditorial(e.target.value)} placeholder="Commissioner supplied context, clearly separated from calculated facts." />
      <div><button disabled={busy || loading || !roundId || !editorial.trim()}>Add to recap notes</button></div>
    </form>
    {exportText && <details open={copyFallback}><summary>Round report preview</summary><label className={styles.editorial}>Round report<textarea readOnly rows={18} value={exportText} onFocus={e => e.target.select()} /></label></details>}
  </section>;
}
