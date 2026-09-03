'use client';

import {useEffect, useMemo, useState} from 'react';
import styles from './ClashLine.module.css';

type ClashLineItem = {
  id: string;
  triggerType: string;
  text: string;
  publishedAt: string;
};

const triggerLabels: Record<string, string> = {
  WIN_STREAK: 'Streak',
  STREAK_SNAPPED: 'Streak',
  UPSET: 'Upset',
  CI_SURGE: 'Clash Index',
  RANK_MILESTONE: 'Ranking',
  CAREER_MILESTONE: 'Milestone',
  FIRST_SINCE: 'History',
  TEAM_SERIES: 'Series',
  DOUBLES_CHEMISTRY: 'Doubles',
  RECORD: 'Record',
};

function clashLineEndpoint(): string {
  const shareToken = new URLSearchParams(window.location.search).get('_vercel_share');
  return shareToken
    ? `/api/clash-line?_vercel_share=${encodeURIComponent(shareToken)}`
    : '/api/clash-line';
}

export function ClashLine() {
  const [items, setItems] = useState<ClashLineItem[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(clashLineEndpoint(), {cache: 'no-store', credentials: 'same-origin'});
        if (!response.ok) return;
        const payload = await response.json() as {items?: ClashLineItem[]};
        if (cancelled) return;
        const next = payload.items ?? [];
        setItems(next);
        setIndex((current) => next.length ? Math.min(current, next.length - 1) : 0);
      } catch {
        // Clash Line is enhancement-only; never interfere with page rendering.
      }
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true);
    void load();
    const refresh = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  const item = items[index] ?? null;
  const category = useMemo(() => item ? (triggerLabels[item.triggerType] ?? 'League') : '', [item]);
  if (!item) return null;

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <aside className={styles.shell} aria-label="Clash Line league facts">
        <div className={styles.brand}>CLASH LINE</div>
        <div className={styles.fact}>
          <span className={styles.category}>{category}</span>
          <span className={styles.text} key={item.id}>{item.text}</span>
        </div>
        <div className={styles.controls}>
          {items.length > 1 ? <span className={styles.count}>{index + 1}/{items.length}</span> : null}
          {items.length > 1 ? (
            <button
              className={styles.pause}
              type="button"
              onClick={() => setPaused((current) => !current)}
              aria-label={paused ? 'Resume Clash Line rotation' : 'Pause Clash Line rotation'}
              title={paused ? 'Resume Clash Line' : 'Pause Clash Line'}
            >
              {paused ? '▶' : 'Ⅱ'}
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
}
