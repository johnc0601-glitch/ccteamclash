import type {Season} from '@/domain/season/Season';
import type {Schedule} from '@/domain/schedule/Schedule';
import type {ScheduleActionProps} from '@/components/schedule/scheduleActions';
import {getSeasonName} from '@/components/schedule/scheduleDisplay';
import {StatusBadge} from '@/components/schedule/StatusBadge';
import styles from './ScheduleManagement.module.css';

type ScheduleTableProps = Omit<ScheduleActionProps, 'canEdit' | 'processing'> & {
  schedules: Schedule[];
  seasons: Season[];
  roundCounts: Record<string, number>;
  activeSeasonId?: string;
  processingId: string | null;
};

export function ScheduleTable({
  schedules,
  seasons,
  roundCounts,
  activeSeasonId,
  processingId,
  onView,
  onEdit,
  onTogglePublication,
  onDelete,
}: ScheduleTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Schedule</th>
            <th>Season</th>
            <th>Rounds</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((schedule) => {
            const canEdit = schedule.seasonId === activeSeasonId;
            return (
              <tr key={schedule.id}>
                <td>
                  <button type="button" className={styles.nameButton} onClick={() => onView(schedule)}>
                    {schedule.name}
                  </button>
                  <span className={styles.rowDescription}>{schedule.description || 'No description'}</span>
                </td>
                <td>{getSeasonName(schedule.seasonId, seasons)}</td>
                <td>{roundCounts[schedule.id] ?? 0}</td>
                <td><StatusBadge status={schedule.published ? 'Published' : 'Draft'} /></td>
                <td>
                  <div className={styles.actionRow}>
                    <button type="button" onClick={() => onView(schedule)}>View</button>
                    {canEdit && !schedule.published ? <button type="button" onClick={() => onEdit(schedule)}>Edit</button> : null}
                    {canEdit ? (
                      <button
                        type="button"
                        disabled={processingId === schedule.id}
                        onClick={() => onTogglePublication(schedule)}
                      >
                        {schedule.published ? 'Unpublish' : 'Publish'}
                      </button>
                    ) : null}
                    {canEdit && !schedule.published ? (
                      <button type="button" className={styles.dangerText} onClick={() => onDelete(schedule)}>Delete</button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
