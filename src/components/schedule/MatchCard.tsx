import type {Course} from '@/domain/course/Course';
import type {Match} from '@/domain/schedule/Match';
import type {Team} from '@/models/Team';
import type {MatchActionProps} from '@/components/schedule/scheduleActions';
import {
  formatScheduleDate,
  formatScheduleTime,
  getCourseName,
  getTeamName,
} from '@/components/schedule/scheduleDisplay';
import {StatusBadge} from '@/components/schedule/StatusBadge';
import styles from './ScheduleManagement.module.css';

type MatchCardProps = MatchActionProps & {
  match: Match;
  teams: Team[];
  courses: Course[];
};

export function MatchCard({
  match,
  teams,
  courses,
  canEditNotes,
  canEditPublicFields,
  onView,
  onEdit,
  onDelete,
}: MatchCardProps) {
  return (
    <article className={styles.compactCard}>
      <div className={styles.cardHeader}>
        <span className={styles.matchTime}>{formatScheduleTime(match.time)}</span>
        <StatusBadge status={match.status} />
      </div>
      <button type="button" className={styles.matchupTitle} onClick={() => onView(match)}>
        {getTeamName(match.homeTeamId, teams)} <span>vs</span> {getTeamName(match.awayTeamId, teams)}
      </button>
      <dl className={styles.compactFacts}>
        <div><dt>Course</dt><dd>{getCourseName(match.courseId, courses)}</dd></div>
        <div><dt>Date</dt><dd>{formatScheduleDate(match.date)}</dd></div>
      </dl>
      <div className={styles.actionRow}>
        <button type="button" onClick={() => onView(match)}>View</button>
        {canEditNotes ? <button type="button" onClick={() => onEdit(match)}>{canEditPublicFields ? 'Edit' : 'Edit notes'}</button> : null}
        {canEditPublicFields ? <button type="button" className={styles.dangerText} onClick={() => onDelete(match)}>Delete</button> : null}
      </div>
    </article>
  );
}
