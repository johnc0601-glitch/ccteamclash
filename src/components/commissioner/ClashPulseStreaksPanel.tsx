'use client';

import {useEffect, useState} from 'react';
import type {PulseFact, PulseRound} from '@/services/pulse/PulseFacts';
import styles from './AroundTheClashDesk.module.css';

type Category = 'Streaks' | 'Broken streaks';
type Bucket = {count: number; facts: PulseFact[]};
type ResponseData = {
  round: {id: string; number: number; date: string | null};
  ongoing: Bucket; broken: Bucket; note: string; warnings: string[];
};

export function ClashPulseStreaksPanel({round, category}: {round: PulseRound | null; category: Category}) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(Boolean(round));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setData(null);
    setError('');
    setNotice('');
    if (!round) {setLoading(false); return;}
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/clash-pulse/streaks?round=${encodeURIComponent(round.id)}`, {
      signal: controller.signal, cache: 'no-store',
    }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Streaks unavailable.');
      return body as ResponseData;
    }).then(response => {
      if (!controller.signal.aborted) setData(response);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Streaks unavailable.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [round?.id]);

  const bucket = category === 'Streaks' ? data?.ongoing : data?.broken;
  async function copy() {
    if (!bucket?.facts.length) return;
    const text = [
      `${category.toUpperCase()} — Round ${round?.number}`,
      data?.note ?? '',
      ...bucket.facts.map(fact => `- ${fact.fact_text}\n  ${fact.calculation}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${category} copied.`);
    } catch {
      setNotice('Clipboard unavailable; select the text from the individual facts.');
    }
  }

  return (
    <section className={styles.factPanel} aria-label={category}>
      <header className={styles.factHeader}>
        <h3>{category}</h3>
        <span>{round ? `Through Round ${round.number} · ${bucket?.count ?? 0} verified` : 'Verified season results only'}</span>
      </header>
      {!round ? (
        <p className={styles.queueEmpty}>
          Verified round-by-round streaks are not available for this historical or all-time scope.
          Select Latest Round or the current Season to see streaks.
        </p>
      ) : (
        <>
          <div className={styles.streakToolbar}>
            <p className={styles.queueEmpty}>{data?.note ?? 'Calculating streaks from confirmed matches and played contests.'}</p>
            <button type="button" className={styles.contextButton}
              disabled={loading || !bucket?.facts.length} onClick={copy}>
              Copy {category}
            </button>
          </div>
          {loading && <p role="status">Loading verified streaks…</p>}
          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          {!loading && !error && bucket && !bucket.facts.length && (
            <p className={styles.queueEmpty}>
              {category === 'Streaks'
                ? 'No ongoing runs of two or more verified results through this round.'
                : 'No verified streaks ended during this round.'}
            </p>
          )}
          {bucket?.facts.map(fact => (
            <article className={styles.streakCard} key={fact.fact_key}>
              <strong>{fact.fact_text}</strong>
              <details>
                <summary>Source and calculation</summary>
                <p>{fact.calculation}</p>
                {fact.sources.map(source => <p key={source.table}>{source.table}: {source.ids.join(', ')}</p>)}
              </details>
            </article>
          ))}
          {bucket && bucket.count > bucket.facts.length && (
            <p className={styles.queueEmpty}>
              Showing the {bucket.facts.length} longest runs of {bucket.count} verified facts.
            </p>
          )}
          {!!data?.warnings.length && (
            <details className={styles.streakNotes}>
              <summary>Data limitations</summary>
              {data.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
            </details>
          )}
        </>
      )}
    </section>
  );
}
