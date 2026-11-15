import type {ReactNode} from 'react';
import type {PublicMatchSpreadSummary} from '@/services/teamStrength/PublicMatchSpread';
import styles from './MatchPredictionCard.module.css';

type Props = {
  spread: PublicMatchSpreadSummary;
  children?: ReactNode;
};

export function PublicMatchSpread({spread, children}: Props) {
  const favorite = spread.favoriteTeam;
  const points = spread.points;

  return (
    <section className={styles.card} aria-label="Clash Challenge match projection">
      <div className={styles.challengeHeading}>
        <svg className={styles.challengeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 21h8M12 17v4M7 4h10v7a5 5 0 0 1-10 0V4ZM17 6h4v3a4 4 0 0 1-4 4M7 6H3v3a4 4 0 0 0 4 4" />
        </svg>
        <h2>Clash Challenge</h2>
      </div>
      {children ? <p className={styles.challengeSubtitle}>Make your pick. Beat the projection.</p> : null}
      <div className={styles.spread}>
        <span className={styles.spreadLabel}>Fixed match projection</span>
        <strong>{favorite ? `${favorite} by ${points.toFixed(1)}` : 'Too close to call'}</strong>
        {spread.isEarlyEstimate ? <span className={styles.spreadLabel}>Early prediction — lineups may change</span> : null}
      </div>
      {children}
    </section>
  );
}
