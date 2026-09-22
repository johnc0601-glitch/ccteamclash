'use client';

import {useEffect, useRef, useState} from 'react';
import type {ClashPulseItem} from '@/services/home/ClashPulseService';
import styles from './ClashPulse.module.css';

export function ClashPulse({items}: {items: ClashPulseItem[]}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [rotationEpoch, setRotationEpoch] = useState(0);
  const touchStart = useRef<{x: number; y: number} | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [items.length, paused, rotationEpoch]);

  if (items.length === 0) return null;

  const item = items[Math.min(index, items.length - 1)] ?? items[0];

  function move(direction: 1 | -1) {
    if (items.length < 2) return;
    setIndex((current) => (current + direction + items.length) % items.length);
    setRotationEpoch((current) => current + 1);
  }

  function handleClick(event: React.MouseEvent<HTMLElement>) {
    if (items.length < 2 || !window.matchMedia('(min-width: 641px)').matches) return;
    if ((event.target as HTMLElement).closest('button')) return;
    move(1);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    if (touch) touchStart.current = {x: touch.clientX, y: touch.clientY};
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy)) return;
    move(dx < 0 ? 1 : -1);
  }

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <aside
        className={styles.shell}
        aria-label="Clash Pulse league facts"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.brand}>CLASH <span>PULSE</span></div>
        <div className={styles.fact} aria-live="polite">
          <span className={styles.category}>{item.category}</span>
          <span className={styles.text} key={item.id}>{item.text}</span>
        </div>
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
        ) : <span className={styles.endcap} aria-hidden="true" />}
      </aside>
    </>
  );
}
