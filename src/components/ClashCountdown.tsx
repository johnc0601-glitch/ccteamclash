'use client';

import {useEffect, useState} from 'react';
import styles from './ClashCountdown.module.css';

const CLASH_START = new Date('2026-10-03T00:00:00-04:00').getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const THREE_DAYS_MS = 3 * DAY_MS;

export function ClashCountdown() {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setRemainingMs(CLASH_START - Date.now());

    update();
    const interval = window.setInterval(update, MINUTE_MS);
    return () => window.clearInterval(interval);
  }, []);

  if (remainingMs === null || remainingMs <= 0) return null;

  const showDetailedTime = remainingMs <= THREE_DAYS_MS;

  return (
    <section className={styles.wrap} aria-label="Countdown to the Clash">
      <div className={`shell ${styles.inner}`} role="timer" aria-live="polite">
        <span className={styles.eyebrow}>Countdown to the Clash</span>
        {showDetailedTime ? <DetailedCountdown remainingMs={remainingMs} /> : <DaysCountdown remainingMs={remainingMs} />}
        <span className={styles.date}>October 3, 2026</span>
      </div>
    </section>
  );
}

function DaysCountdown({remainingMs}: {remainingMs: number}) {
  const days = Math.ceil(remainingMs / DAY_MS);

  return (
    <div className={styles.daysOnly}>
      <strong>{days}</strong>
      <span>{days === 1 ? 'Day' : 'Days'}</span>
    </div>
  );
}

function DetailedCountdown({remainingMs}: {remainingMs: number}) {
  const days = Math.floor(remainingMs / DAY_MS);
  const hours = Math.floor((remainingMs % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((remainingMs % HOUR_MS) / MINUTE_MS);

  return (
    <div className={styles.detail}>
      <TimePart value={days} label={days === 1 ? 'Day' : 'Days'} />
      <span className={styles.divider}>·</span>
      <TimePart value={hours} label={hours === 1 ? 'Hr' : 'Hrs'} />
      <span className={styles.divider}>·</span>
      <TimePart value={minutes} label="Min" />
    </div>
  );
}

function TimePart({value, label}: {value: number; label: string}) {
  return (
    <span className={styles.timePart}>
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}
