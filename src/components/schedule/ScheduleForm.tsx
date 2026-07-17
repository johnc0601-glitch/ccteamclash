import {useState, type FormEvent} from 'react';
import type {Season} from '@/domain/season/Season';
import type {
  ScheduleFieldErrors,
  ScheduleInput,
} from '@/domain/schedule/Schedule';
import styles from './ScheduleManagement.module.css';

type ScheduleFormProps = {
  initialValues: ScheduleInput;
  seasons: Season[];
  fieldErrors: ScheduleFieldErrors;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: ScheduleInput) => void;
  onCancel: () => void;
};

export function ScheduleForm({
  initialValues,
  seasons,
  fieldErrors,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: ScheduleFormProps) {
  const [values, setValues] = useState(initialValues);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form className={styles.scheduleForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.formGrid}>
        <label>
          <span>Season</span>
          <select
            autoFocus
            data-initial-focus
            value={values.seasonId}
            onChange={(event) => setValues((current) => ({...current, seasonId: event.target.value}))}
            aria-invalid={Boolean(fieldErrors.seasonId)}
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>{season.name}</option>
            ))}
          </select>
          {fieldErrors.seasonId ? <small className={styles.fieldError}>{fieldErrors.seasonId}</small> : null}
        </label>
        <label>
          <span>Schedule name</span>
          <input
            value={values.name}
            onChange={(event) => setValues((current) => ({...current, name: event.target.value}))}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? <small className={styles.fieldError}>{fieldErrors.name}</small> : null}
        </label>
        <label className={styles.fullField}>
          <span>Description</span>
          <textarea
            rows={4}
            value={values.description}
            onChange={(event) => setValues((current) => ({...current, description: event.target.value}))}
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
