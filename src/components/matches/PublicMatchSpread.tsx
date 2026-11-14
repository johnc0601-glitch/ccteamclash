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
  const movementDirection = delta > 0 ? 'toward the favorite' : 'toward the underdog';
  const closeness = points < 0.5 ? 'Even on projected points'
    : points <= 4 ? 'Within one doubles-result swing (4 pts)'
      : points <= 8 ? 'Within two doubles-result swings (8 pts)'
        : 'More than two doubles-result swings apart';

  return (
    <section className={styles.card} aria-label="Public projected point spread">
      <h2>The Clash Line</h2>
      <div className={styles.spread}>
        <span className={styles.spreadLabel}>{movement ? 'Current line' : 'Projected point spread'}</span>
        <strong>{favorite ? `${favorite} −${points.toFixed(1)}` : 'Pick ’em'}</strong>
        {moved ? (
          <span className={styles.lineMovement}>
            Opened: {openingFavorite} −{openingPoints?.toFixed(1)}
            <span className={styles.lineMovementNote}>Moved {Math.abs(delta).toFixed(1)} {Math.abs(delta) === 1 ? 'point' : 'points'} {movementDirection}</span>
          </span>
        ) : null}
        <span className={styles.spreadMeta}>
          {favorite
            ? `${favorite} favored by ${points.toFixed(1)} ${points === 1 ? 'point' : 'points'}`
            : 'No meaningful favorite'}
        </span>
        <span className={styles.closeness}>{closeness}</span>
        {spread.isEarlyEstimate && !movement ? <span className={styles.spreadLabel}>Early estimate — lineups may change</span> : null}
        {movement ? <span className={styles.caution}>Line opened from the Clash Index model and moves with commissioner picks. Closes at match start.</span>
          : <span className={styles.caution}>Typical projection error is about 5 points; bonuses and penalties may change the outcome.</span>}
      </div>
      {children}
    </section>
  );
}
