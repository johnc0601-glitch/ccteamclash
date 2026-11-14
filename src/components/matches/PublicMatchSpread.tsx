import type {PublicMatchSpreadSummary} from '@/services/teamStrength/PublicMatchSpread';
import styles from './MatchPredictionCard.module.css';

export function PublicMatchSpread({spread}: {spread: PublicMatchSpreadSummary}) {
  return (
    <section className={styles.card} aria-label="Public projected point spread">
      <h2>The Clash Line</h2>
      <div className={styles.spread}>
        <span className={styles.spreadLabel}>Projected point spread</span>
        <strong>{spread.favoriteTeam ? `${spread.favoriteTeam} −${spread.points.toFixed(1)}` : 'Pick ’em'}</strong>
        <span className={styles.spreadMeta}>
          {spread.favoriteTeam
            ? `${spread.favoriteTeam} favored by ${spread.points.toFixed(1)} ${spread.points === 1 ? 'point' : 'points'}`
            : 'No meaningful favorite'}
        </span>
        <span className={styles.closeness}>{spread.closeness}</span>
        {spread.isEarlyEstimate ? <span className={styles.spreadLabel}>Early estimate — lineups may change</span> : null}
        <span className={styles.caution}>Typical projection error is about 5 points; bonuses and penalties may change the outcome.</span>
      </div>
    </section>
  );
}
