import type {Season} from '@/domain/season/Season';
import styles from './SeasonManagement.module.css';

type SeasonActionsProps = {
  season: Season;
  disabled?: boolean;
  onView: (season: Season) => void;
  onEdit: (season: Season) => void;
  onArchive: (season: Season) => void;
  onDuplicate: (season: Season) => void;
  onActivate: (season: Season) => void;
  onDelete: (season: Season) => void;
};

export function SeasonActions({
  season,
  disabled = false,
  onView,
  onEdit,
  onArchive,
  onDuplicate,
  onActivate,
  onDelete,
}: SeasonActionsProps) {
  return (
    <div className={styles.seasonActions}>
      <button type="button" disabled={disabled} onClick={() => onView(season)}>View</button>
      {!season.archived ? (
        <button type="button" disabled={disabled} onClick={() => onEdit(season)}>Edit</button>
      ) : null}
      <button type="button" disabled={disabled} onClick={() => onDuplicate(season)}>Duplicate</button>
      {!season.active && !season.archived ? (
        <button type="button" disabled={disabled} onClick={() => onActivate(season)}>Activate</button>
      ) : null}
      {!season.archived ? (
        <button type="button" disabled={disabled} onClick={() => onArchive(season)}>Archive</button>
      ) : null}
      <button
        type="button"
        className={styles.dangerText}
        disabled={disabled}
        onClick={() => onDelete(season)}
      >
        Delete
      </button>
    </div>
  );
}
