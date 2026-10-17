import styles from './LiveScoringLink.module.css';

export function LiveScoringLink({href, matchup}: {href: string; matchup: string}) {
  return (
    <a
      className={styles.link}
      href={href}
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
