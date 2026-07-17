import {useState, type FormEvent} from 'react';
import type {RoundInput} from '@/domain/schedule/Round';
import type {ScheduleFieldErrors} from '@/domain/schedule/Schedule';
import styles from './ScheduleManagement.module.css';

type RoundFormProps = {
  initialValues: RoundInput;
  fieldErrors: ScheduleFieldErrors;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: RoundInput) => void;
  onCancel: () => void;
};

export function RoundForm({
  initialValues,
  fieldErrors,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: RoundFormProps) {
  const [values, setValues] = useState({...initialValues, number: String(initialValues.number)});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({...values, number: Number(values.number)});
  }

  return (
    <form className={styles.scheduleForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.formGrid}>
        <label>
          <span>Round number</span>
          <input
            autoFocus
            data-initial-focus
            type="number"
            min="1"
            value={values.number}
            onChange={(event) => setValues((current) => ({...current, number: event.target.value}))}
            aria-invalid={Boolean(fieldErrors.number)}
          />
          {fieldErrors.number ? <small className={styles.fieldError}>{fieldErrors.number}</small> : null}
        </label>
        <label>
          <span>Round name</span>
          <input
            value={values.name}
            onChange={(event) => setValues((current) => ({...current, name: event.target.value}))}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? <small className={styles.fieldError}>{fieldErrors.name}</small> : null}
        </label>
        <label className={styles.fullField}>
          <span>Play date</span>
          <input
            type="date"
            value={values.date}
            onChange={(event) => setValues((current) => ({...current, date: event.target.value}))}
            aria-invalid={Boolean(fieldErrors.date)}
          />
          {fieldErrors.date ? <small className={styles.fieldError}>{fieldErrors.date}</small> : null}
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
