import type {Season} from '@/domain/season/Season';
import {SeasonActions} from '@/components/seasons/SeasonActions';
import {StatusBadge} from '@/components/seasons/StatusBadge';
import {formatSeasonDate} from '@/components/seasons/seasonDisplay';
import styles from './SeasonManagement.module.css';

type SeasonRowProps = {
  season: Season;
  disabled?: boolean;
  onView: (season: Season) => void;
  onEdit: (season: Season) => void;
  onArchive: (season: Season) => void;
  onDuplicate: (season: Season) => void;
  onActivate: (season: Season) => void;
  onDelete: (season: Season) => void;
};

export function SeasonRow({season, disabled, ...actions}: SeasonRowProps) {
  return (
    <tr>
      <td>
        <button type="button" className={styles.seasonNameButton} onClick={() => actions.onView(season)}>
          {season.name}
        </button>
        <span className={styles.seasonDescription}>{season.description || 'No description added'}</span>
      </td>
      <td>{season.year}</td>
      <td><StatusBadge season={season} /></td>
      <td>{formatSeasonDate(season.startDate)}</td>
      <td>{formatSeasonDate(season.endDate)}</td>
      <td>
        <span className={season.published ? styles.publicationPublished : styles.publicationDraft}>
          {season.published ? 'Yes' : 'No'}
        </span>
      </td>
      <td><SeasonActions season={season} disabled={disabled} {...actions} /></td>
    </tr>
  );
}
