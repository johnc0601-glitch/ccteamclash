import type {MatchResult} from '@/domain/results/MatchResult';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import styles from '@/app/matches/[id]/MatchdayV1.module.css';

export function MatchScoreboard({
  matchday,
  result,
}: {
  matchday: PublicMatchday;
  result: MatchResult | undefined;
}) {
  const awayScore = result?.awayScore ?? '—';
  const homeScore = result?.homeScore ?? '—';

  return (
    <section className={styles.scoreCard} aria-label="Match scoring">
      <div className={styles.scoreTop}>
        <div className={styles.teamScore}>
          <span className={styles.teamName}>{matchday.awayTeam.name}</span>
          <strong className={styles.scoreValue}>{awayScore}</strong>
        </div>
        <span className={styles.scoreMiddle}>VS</span>
        <div className={styles.teamScore}>
          <span className={styles.teamName}>{matchday.homeTeam.name}</span>
          <strong className={styles.scoreValue}>{homeScore}</strong>
        </div>
      </div>

      <details className={styles.scoreDetails}>
        <summary>{result ? 'View full scoring' : 'Scoring'}</summary>
        <div className={styles.scorePlaceholder}>
          {result
            ? 'Singles and doubles scoring will expand here using the existing published Matchday contest data.'
            : 'Official scoring will appear here after results are posted.'}
        </div>
      </details>
    </section>
  );
}
