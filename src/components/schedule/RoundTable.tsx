import type {Round} from '@/domain/schedule/Round';
import type {RoundActionProps} from '@/components/schedule/scheduleActions';
import {formatScheduleDate} from '@/components/schedule/scheduleDisplay';
import {StatusBadge} from '@/components/schedule/StatusBadge';
import styles from './ScheduleManagement.module.css';

type RoundTableProps = Omit<RoundActionProps, 'canEdit'> & {
  rounds: Round[];
  matchCounts: Record<string, number>;
  canEdit: boolean;
};

export function RoundTable({rounds, matchCounts, canEdit, onView, onEdit, onDelete}: RoundTableProps) {
  return (
    <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
      <table className={styles.dataTable}>
        <thead><tr><th>Round</th><th>Name</th><th>Date</th><th>Matches</th><th>Visibility</th><th>Actions</th></tr></thead>
        <tbody>
          {rounds.map((round) => (
            <tr key={round.id}>
              <td>{round.number}</td>
              <td><button type="button" className={styles.nameButton} onClick={() => onView(round)}>{round.name}</button></td>
              <td>{formatScheduleDate(round.date)}</td>
              <td>{matchCounts[round.id] ?? 0}</td>
              <td><StatusBadge status={round.published ? 'Published' : 'Draft'} /></td>
              <td>
                <div className={styles.actionRow}>
                  <button type="button" onClick={() => onView(round)}>View</button>
                  {canEdit ? <button type="button" onClick={() => onEdit(round)}>Edit</button> : null}
                  {canEdit ? <button type="button" className={styles.dangerText} onClick={() => onDelete(round)}>Delete</button> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
