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

type MatchTableProps = Omit<MatchActionProps, 'canEditNotes' | 'canEditPublicFields'> & {
  matches: Match[];
  teams: Team[];
  courses: Course[];
  canEditNotes: boolean;
  canEditPublicFields: boolean;
};

export function MatchTable({
  matches,
  teams,
  courses,
  canEditNotes,
  canEditPublicFields,
  onView,
  onEdit,
  onDelete,
}: MatchTableProps) {
  return (
    <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
      <table className={`${styles.dataTable} ${styles.matchTable}`}>
        <thead>
          <tr><th>Home Team</th><th>Away Team</th><th>Course</th><th>Date</th><th>Time</th><th>Status</th><th>Notes</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={match.id}>
              <td><button type="button" className={styles.nameButton} onClick={() => onView(match)}>{getTeamName(match.homeTeamId, teams)}</button></td>
              <td>{getTeamName(match.awayTeamId, teams)}</td>
              <td>{getCourseName(match.courseId, courses)}</td>
              <td>{formatScheduleDate(match.date)}</td>
              <td>{formatScheduleTime(match.time)}</td>
              <td><StatusBadge status={match.status} /></td>
              <td><span className={styles.notesPreview}>{match.notes || 'None'}</span></td>
              <td>
                <div className={styles.actionRow}>
                  <button type="button" onClick={() => onView(match)}>View</button>
                  {canEditNotes ? <button type="button" onClick={() => onEdit(match)}>{canEditPublicFields ? 'Edit' : 'Notes'}</button> : null}
                  {canEditPublicFields ? <button type="button" className={styles.dangerText} onClick={() => onDelete(match)}>Delete</button> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
