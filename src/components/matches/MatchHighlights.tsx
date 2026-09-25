import type {MatchClashPulseHighlight} from '@/services/stories/ClashPulseFactCandidateService';
import styles from './MatchHighlights.module.css';

export function MatchHighlights({highlights}: {highlights: MatchClashPulseHighlight[]}) {
  if (!highlights.length) return null;

  return (
    <section className={styles.section} aria-labelledby="match-highlights-heading">
      <header className={styles.header}>
        <span>After the Clash</span>
        <h2 id="match-highlights-heading">What mattered</h2>
      </header>
      <div className={styles.grid}>
        {highlights.map((highlight) => (
          <article className={styles.card} key={highlight.id}>
            <span className={styles.type}>{highlight.storyType}</span>
            <strong className={styles.value}>{highlight.value}</strong>
            <h3>{highlight.headline}</h3>
            <p>{highlight.pulseText}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
