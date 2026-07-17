import type {Round} from '@/domain/schedule/Round';
import type {RoundActionProps} from '@/components/schedule/scheduleActions';
import {formatScheduleDate} from '@/components/schedule/scheduleDisplay';
import {StatusBadge} from '@/components/schedule/StatusBadge';
import styles from './ScheduleManagement.module.css';

type RoundCardProps = RoundActionProps & {
  round: Round;
  matchCount: number;
};

export function RoundCard({round, matchCount, canEdit, onView, onEdit, onDelete}: RoundCardProps) {
  return (
    <article className={styles.compactCard}>
      <div className={styles.cardHeader}>
        <span className={styles.roundMarker}>Round {round.number}</span>
        <StatusBadge status={round.published ? 'Published' : 'Draft'} />
      </div>
      <button type="button" className={styles.compactTitle} onClick={() => onView(round)}>{round.name}</button>
      <dl className={styles.compactFacts}>
        <div><dt>Date</dt><dd>{formatScheduleDate(round.date)}</dd></div>
        <div><dt>Matches</dt><dd>{matchCount}</dd></div>
      </dl>
      <div className={styles.actionRow}>
        <button type="button" onClick={() => onView(round)}>View</button>
        {canEdit ? <button type="button" onClick={() => onEdit(round)}>Edit</button> : null}
        {canEdit ? <button type="button" className={styles.dangerText} onClick={() => onDelete(round)}>Delete</button> : null}
      </div>
    </article>
  );
}
