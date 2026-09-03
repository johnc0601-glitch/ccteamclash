'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
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
  const [rotationEpoch, setRotationEpoch] = useState(0);
  const touchStart = useRef<{x: number; y: number} | null>(null);

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
        // Clash Pulse is enhancement-only; never interfere with page rendering.
      }
    }

    const refreshNow = () => void load();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true);
    void load();
    window.addEventListener('clash-line-updated', refreshNow);
    const refresh = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.removeEventListener('clash-line-updated', refreshNow);
      window.clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [items.length, paused, rotationEpoch]);

  function move(direction: 1 | -1) {
    if (items.length < 2) return;
    setIndex((current) => (current + direction + items.length) % items.length);
    setRotationEpoch((current) => current + 1);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    if (!touch) return;
    touchStart.current = {x: touch.clientX, y: touch.clientY};
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy)) return;
    move(dx < 0 ? 1 : -1);
  }

  const item = items[index] ?? null;
  const category = useMemo(() => item ? (triggerLabels[item.triggerType] ?? 'League') : '', [item]);
  if (!item) return null;

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <aside
        className={styles.shell}
        aria-label="Clash Pulse league facts"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.brand}><span className={styles.brandClash}>CLASH </span>PULSE</div>
        <div className={styles.fact} aria-live="polite">
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
              aria-label={paused ? 'Resume Clash Pulse rotation' : 'Pause Clash Pulse rotation'}
              title={paused ? 'Resume Clash Pulse' : 'Pause Clash Pulse'}
            >
              {paused ? '▶' : 'Ⅱ'}
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
}
