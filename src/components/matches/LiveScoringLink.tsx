'use client';

import {useEffect, useState} from 'react';
import {isWithinMatchdayWindow} from '@/services/matches/MatchdayTimeWindow';
import styles from './LiveScoringLink.module.css';

// The page can remain open across 6 PM. Hide the previously rendered link when
// the display window ends, and prevent a stale click even between clock checks.
export function LiveScoringLink({href, matchup, matchDate}: {href: string; matchup: string; matchDate: string}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const check = () => setVisible(isWithinMatchdayWindow(matchDate));
    check();
    const timer = window.setInterval(check, 10_000);
    return () => window.clearInterval(timer);
  }, [matchDate]);
  if (!visible) return null;

  return (
    <a
      className={styles.link}
      href={href}
      onClick={event => {
        if (!isWithinMatchdayWindow(matchDate)) {
          event.preventDefault();
          setVisible(false);
        }
      }}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`LIVE SCORES: Follow live scoring for ${matchup} on TC Whiteboard (opens in a new tab)`}
      title="Follow live scoring on TC Whiteboard"
    >
      <svg className={styles.signal} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M8 8a6 6 0 0 0 0 8m8-8a6 6 0 0 1 0 8" />
        <path d="M5 5a10 10 0 0 0 0 14m14-14a10 10 0 0 1 0 14" />
        <circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none" />
      </svg>
      <strong>LIVE SCORES</strong>
    </a>
  );
}
