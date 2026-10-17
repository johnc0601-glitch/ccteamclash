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
      <span className={styles.dot} aria-hidden="true" />
      <strong>LIVE SCORES</strong>
    </a>
  );
}
