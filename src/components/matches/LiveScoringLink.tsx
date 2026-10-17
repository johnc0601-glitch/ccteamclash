import styles from './LiveScoringLink.module.css';

export function LiveScoringLink({href, matchup}: {href: string; matchup: string}) {
  return (
    <a
      className={styles.link}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`LIVE! Follow live scoring for ${matchup} on TC Whiteboard (opens in a new tab)`}
      title="Follow live scoring on TC Whiteboard"
    >
      <span className={styles.dot} aria-hidden="true" />
      <strong>LIVE!</strong>
      <span className={styles.external} aria-hidden="true">↗</span>
    </a>
  );
}
