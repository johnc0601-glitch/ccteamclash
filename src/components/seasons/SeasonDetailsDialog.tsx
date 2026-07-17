import type {Season} from '@/domain/season/Season';
import {DialogShell} from '@/components/teams/DialogShell';
import {StatusBadge} from '@/components/seasons/StatusBadge';
import {formatSeasonDate} from '@/components/seasons/seasonDisplay';
import styles from './SeasonManagement.module.css';

type SeasonDetailsDialogProps = {
  season: Season;
  onEdit: (season: Season) => void;
  onClose: () => void;
};

export function SeasonDetailsDialog({season, onEdit, onClose}: SeasonDetailsDialogProps) {
  return (
    <DialogShell title={season.name} eyebrow="Season details" onClose={onClose}>
      <div className={styles.detailsBody}>
        <div className={styles.detailsLead}>
          <span className={styles.yearMarkerLarge}>{season.year}</span>
          <div>
            <StatusBadge season={season} />
            <p>{season.description || 'No season description has been added.'}</p>
          </div>
        </div>
        <dl className={styles.detailsGrid}>
          <div><dt>Start date</dt><dd>{formatSeasonDate(season.startDate)}</dd></div>
          <div><dt>End date</dt><dd>{formatSeasonDate(season.endDate)}</dd></div>
          <div><dt>Published</dt><dd>{season.published ? 'Yes' : 'No'}</dd></div>
          <div><dt>Registration</dt><dd>{season.registrationOpen ? 'Open' : 'Closed'}</dd></div>
          <div><dt>Created</dt><dd>{new Date(season.createdAt).toLocaleDateString()}</dd></div>
          <div><dt>Last updated</dt><dd>{new Date(season.updatedAt).toLocaleDateString()}</dd></div>
        </dl>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Close</button>
          {!season.archived ? (
            <button type="button" className={styles.primaryButton} onClick={() => onEdit(season)}>
              Edit season
            </button>
          ) : null}
        </div>
      </div>
    </DialogShell>
  );
}
