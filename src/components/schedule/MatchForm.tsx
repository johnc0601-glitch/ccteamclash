import {useState, type FormEvent} from 'react';
import type {Course} from '@/domain/course/Course';
import {MATCH_STATUSES, type MatchInput} from '@/domain/schedule/Match';
import type {ScheduleFieldErrors} from '@/domain/schedule/Schedule';
import type {Team} from '@/models/Team';
import styles from './ScheduleManagement.module.css';

type MatchFormProps = {
  initialValues: MatchInput;
  teams: Team[];
  courses: Course[];
  fieldErrors: ScheduleFieldErrors;
  submitLabel: string;
  submitting: boolean;
  publicFieldsLocked?: boolean;
  onSubmit: (values: MatchInput) => void;
  onCancel: () => void;
};

export function MatchForm({
  initialValues,
  teams,
  courses,
  fieldErrors,
  submitLabel,
  submitting,
  publicFieldsLocked = false,
  onSubmit,
  onCancel,
}: MatchFormProps) {
  const [values, setValues] = useState(initialValues);

  function setField<K extends keyof MatchInput>(field: K, value: MatchInput[K]) {
    setValues((current) => ({...current, [field]: value}));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form className={styles.scheduleForm} onSubmit={handleSubmit} noValidate>
      {publicFieldsLocked ? (
        <p className={styles.lockNotice}>Public match fields are locked while this schedule is published. Internal notes remain editable.</p>
      ) : null}
      <div className={styles.formGrid}>
        <label>
          <span>Home team</span>
          <select
            autoFocus={!publicFieldsLocked}
            data-initial-focus={publicFieldsLocked ? undefined : true}
            value={values.homeTeamId}
            disabled={publicFieldsLocked}
            onChange={(event) => setField('homeTeamId', event.target.value)}
            aria-invalid={Boolean(fieldErrors.homeTeamId)}
          >
            <option value="">Select home team</option>
            {teams.filter((team) => team.active).map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          {fieldErrors.homeTeamId ? <small className={styles.fieldError}>{fieldErrors.homeTeamId}</small> : null}
        </label>
        <label>
          <span>Away team</span>
          <select
            value={values.awayTeamId}
            disabled={publicFieldsLocked}
            onChange={(event) => setField('awayTeamId', event.target.value)}
            aria-invalid={Boolean(fieldErrors.awayTeamId)}
          >
            <option value="">Select away team</option>
            {teams.filter((team) => team.active).map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          {fieldErrors.awayTeamId ? <small className={styles.fieldError}>{fieldErrors.awayTeamId}</small> : null}
        </label>
        <label className={styles.fullField}>
          <span>Course</span>
          <select
            value={values.courseId}
            disabled={publicFieldsLocked}
            onChange={(event) => setField('courseId', event.target.value)}
            aria-invalid={Boolean(fieldErrors.courseId)}
          >
            <option value="">Select course</option>
            {courses.filter((course) => course.active).map((course) => (
              <option key={course.id} value={course.id}>{course.name} - {course.city}, {course.state}</option>
            ))}
          </select>
          {fieldErrors.courseId ? <small className={styles.fieldError}>{fieldErrors.courseId}</small> : null}
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={values.date} readOnly disabled={publicFieldsLocked} />
        </label>
        <label>
          <span>Time</span>
          <input
            type="time"
            value={values.time}
            disabled={publicFieldsLocked}
            onChange={(event) => setField('time', event.target.value)}
            aria-invalid={Boolean(fieldErrors.time)}
          />
          {fieldErrors.time ? <small className={styles.fieldError}>{fieldErrors.time}</small> : null}
        </label>
        <label>
          <span>Status</span>
          <select
            value={values.status}
            disabled={publicFieldsLocked}
            onChange={(event) => setField('status', event.target.value as MatchInput['status'])}
          >
            {MATCH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className={styles.fullField}>
          <span>Internal notes</span>
          <textarea
            autoFocus={publicFieldsLocked}
            data-initial-focus={publicFieldsLocked ? true : undefined}
            rows={4}
            value={values.notes}
            onChange={(event) => setField('notes', event.target.value)}
          />
        </label>
      </div>
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.primaryButton} disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
