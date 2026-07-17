import type {MatchStatus} from '@/domain/schedule/Match';
import styles from './ScheduleManagement.module.css';

type StatusBadgeProps = {
  status: MatchStatus | 'Published' | 'Draft';
};

export function StatusBadge({status}: StatusBadgeProps) {
  const className = {
    Published: styles.statusPublished,
    Draft: styles.statusDraft,
    Scheduled: styles.statusScheduled,
    Completed: styles.statusCompleted,
    Postponed: styles.statusPostponed,
    Cancelled: styles.statusCancelled,
    'Rain Delay': styles.statusRainDelay,
  }[status];

  return <span className={className}>{status}</span>;
}
