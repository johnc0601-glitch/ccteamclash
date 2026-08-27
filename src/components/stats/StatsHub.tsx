'use client';

import {useEffect, useState, type ReactNode} from 'react';
import styles from '@/app/stats/Stats.module.css';

type StatsView = 'performance' | 'rankings';

export function StatsHub({performance, rankings}: {performance: ReactNode; rankings: ReactNode}) {
  const [view, setView] = useState<StatsView>('performance');

  useEffect(() => {
    if (window.location.hash === '#rankings') setView('rankings');
  }, []);

  function changeView(next: StatsView) {
    setView(next);
    const url = next === 'rankings' ? '/stats#rankings' : '/stats';
    window.history.replaceState(window.history.state, '', url);
  }

  return (
    <section className={styles.statsHub}>
      <div className={styles.viewControl}>
        <label htmlFor="stats-view">View</label>
        <select id="stats-view" value={view} onChange={(event) => changeView(event.target.value as StatsView)}>
          <option value="performance">Player stats</option>
          <option value="rankings">Rankings</option>
        </select>
      </div>
      <div hidden={view !== 'performance'}>{performance}</div>
      <div id="rankings" hidden={view !== 'rankings'}>{rankings}</div>
    </section>
  );
}
