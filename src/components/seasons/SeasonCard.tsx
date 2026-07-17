import type {Season} from '@/domain/season/Season';
import {SeasonActions} from '@/components/seasons/SeasonActions';
import {StatusBadge} from '@/components/seasons/StatusBadge';
import {formatSeasonDate} from '@/components/seasons/seasonDisplay';
import styles from './SeasonManagement.module.css';

type SeasonCardProps = {
  season: Season;
  disabled?: boolean;
  onView: (season: Season) => void;
  onEdit: (season: Season) => void;
  onArchive: (season: Season) => void;
  onDuplicate: (season: Season) => void;
  onActivate: (season: Season) => void;
  onDelete: (season: Season) => void;
};

export function SeasonCard({season, disabled, ...actions}: SeasonCardProps) {
  return (
    <article className={styles.seasonCard}>
      <div className={styles.cardHeader}>
        <span className={styles.yearMarker}>{season.year}</span>
        <StatusBadge season={season} />
      </div>
      <button type="button" className={styles.cardTitle} onClick={() => actions.onView(season)}>
        {season.name}
      </button>
      <dl className={styles.cardFacts}>
        <div><dt>Starts</dt><dd>{formatSeasonDate(season.startDate)}</dd></div>
        <div><dt>Ends</dt><dd>{formatSeasonDate(season.endDate)}</dd></div>
        <div><dt>Published</dt><dd>{season.published ? 'Yes' : 'No'}</dd></div>
      </dl>
      <p className={styles.cardDescription}>{season.description || 'No season description has been added.'}</p>
      <SeasonActions season={season} disabled={disabled} {...actions} />
    </article>
  );
}
