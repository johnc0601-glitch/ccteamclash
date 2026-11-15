import type {ReactNode} from 'react';
import type {PublicMatchSpreadSummary} from '@/services/teamStrength/PublicMatchSpread';
import type {ClashLineMovement} from '@/services/teamStrength/SpreadVoteStore';
import styles from './MatchPredictionCard.module.css';

type Props = {
  spread: PublicMatchSpreadSummary;
  movement?: ClashLineMovement | null;
  homeName: string;
  awayName: string;
  children?: ReactNode;
};

export function PublicMatchSpread({spread, movement, homeName, awayName, children}: Props) {
  const current = movement?.currentHomeLine;
  const favorite = current != null ? (current > 0 ? homeName : awayName) : spread.favoriteTeam;
  const points = current != null ? Math.abs(current) : spread.points;
  const moved = movement && movement.currentHomeLine !== movement.openingHomeLine;
  const openingFavorite = movement ? (movement.openingHomeLine > 0 ? homeName : awayName) : null;
  const openingPoints = movement ? Math.abs(movement.openingHomeLine) : null;
  const delta = movement ? Math.abs(movement.currentHomeLine) - Math.abs(movement.openingHomeLine) : 0;
  const movementDirection = delta > 0 ? 'higher' : 'lower';

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
        <span className={styles.spreadLabel}>{movement ? 'Updated match projection' : 'Projected match result'}</span>
        <strong>{favorite ? `${favorite} by ${points.toFixed(1)}` : 'Too close to call'}</strong>
        {moved ? (
          <span className={styles.lineMovement}>
            Original projection: {openingFavorite} by {openingPoints?.toFixed(1)}
            <span className={styles.lineMovementNote}>Community adjustment: {Math.abs(delta).toFixed(1)} {Math.abs(delta) === 1 ? 'point' : 'points'} {movementDirection}</span>
          </span>
        ) : null}
        {spread.isEarlyEstimate && !movement ? <span className={styles.spreadLabel}>Early prediction — lineups may change</span> : null}
      </div>
      {children}
    </section>
  );
}
