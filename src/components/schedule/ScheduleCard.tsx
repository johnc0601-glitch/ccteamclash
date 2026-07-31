import type {Season} from '@/domain/season/Season';
import type {Schedule} from '@/domain/schedule/Schedule';
import type {ScheduleActionProps} from '@/components/schedule/scheduleActions';
import {getSeasonName} from '@/components/schedule/scheduleDisplay';
import {StatusBadge} from '@/components/schedule/StatusBadge';
import styles from './ScheduleManagement.module.css';

type ScheduleCardProps = ScheduleActionProps & {
  schedule: Schedule;
  seasons: Season[];
  roundCount: number;
};

export function ScheduleCard({
  schedule,
  seasons,
  roundCount,
  canEdit,
  processing,
  onView,
  onTogglePublication,
}: ScheduleCardProps) {
  return (
    <article className={styles.scheduleCard}>
      <div className={styles.cardHeader}>
        <span className={styles.cardMarker}>{roundCount}</span>
        <StatusBadge status={schedule.published ? 'Published' : 'Draft'} />
      </div>
      <button type="button" className={styles.cardTitle} onClick={() => onView(schedule)}>
        {schedule.name}
      </button>
      <p className={styles.cardSeason}>{getSeasonName(schedule.seasonId, seasons)}</p>
      <p className={styles.cardDescription}>{schedule.description || 'No schedule description.'}</p>
      <div className={styles.actionRow}>
        <button type="button" onClick={() => onView(schedule)}>View</button>
        {canEdit ? (
          <button type="button" disabled={processing} onClick={() => onTogglePublication(schedule)}>
            {schedule.published ? 'Unpublish' : 'Publish'}
          </button>
        ) : null}
      </div>
    </article>
  );
}
