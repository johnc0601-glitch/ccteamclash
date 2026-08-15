import {useState, type FormEvent} from 'react';
import type {SeasonFieldErrors, SeasonInput} from '@/domain/season/Season';
import styles from './SeasonManagement.module.css';

type SeasonFormProps = {
  initialValues: SeasonInput;
  fieldErrors: SeasonFieldErrors;
  submitLabel: string;
  submitting: boolean;
  rosterRulesLocked: boolean;
  onSubmit: (values: SeasonInput) => void;
  onCancel: () => void;
};

type SeasonFormState = Omit<
  SeasonInput,
  'year' | 'mensRosterCap' | 'womensRosterCap' | 'juniorRosterCap'
> & {
  year: string;
  mensRosterCap: string;
  womensRosterCap: string;
  juniorRosterCap: string;
};

export function SeasonForm({
  initialValues,
  fieldErrors,
  submitLabel,
  submitting,
  rosterRulesLocked,
  onSubmit,
  onCancel,
}: SeasonFormProps) {
  const [values, setValues] = useState<SeasonFormState>({
    ...initialValues,
    year: String(initialValues.year),
    mensRosterCap: String(initialValues.mensRosterCap),
    womensRosterCap: initialValues.womensRosterCap === null ? '' : String(initialValues.womensRosterCap),
    juniorRosterCap: initialValues.juniorRosterCap === null ? '' : String(initialValues.juniorRosterCap),
  });

  function setTextField(field: 'name' | 'year' | 'description' | 'startDate' | 'endDate', value: string) {
    setValues((current) => ({...current, [field]: value}));
  }

  function setBooleanField(field: 'registrationOpen' | 'published', value: boolean) {
    setValues((current) => ({...current, [field]: value}));
  }

  function setRosterCap(field: 'mensRosterCap' | 'womensRosterCap' | 'juniorRosterCap', value: string) {
    setValues((current) => ({...current, [field]: value}));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      ...values,
      year: Number(values.year),
      mensRosterCap: Number(values.mensRosterCap),
      womensRosterCap: optionalNumber(values.womensRosterCap),
      juniorRosterCap: optionalNumber(values.juniorRosterCap),
    });
  }

  return (
    <form className={styles.seasonForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.formGrid}>
        <label>
          <span>Season name</span>
          <input
            autoFocus
            data-initial-focus
            name="name"
            value={values.name}
            onChange={(event) => setTextField('name', event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'season-name-error' : undefined}
          />
          {fieldErrors.name ? (
            <small id="season-name-error" className={styles.fieldError}>{fieldErrors.name}</small>
          ) : null}
        </label>
        <label>
          <span>Year</span>
          <input
            name="year"
            type="number"
            inputMode="numeric"
            min="1"
            value={values.year}
            onChange={(event) => setTextField('year', event.target.value)}
            aria-invalid={Boolean(fieldErrors.year)}
            aria-describedby={fieldErrors.year ? 'season-year-error' : undefined}
          />
          {fieldErrors.year ? (
            <small id="season-year-error" className={styles.fieldError}>{fieldErrors.year}</small>
          ) : null}
        </label>
        <label>
          <span>Start date</span>
          <input
            name="startDate"
            type="date"
            value={values.startDate}
            onChange={(event) => setTextField('startDate', event.target.value)}
            aria-invalid={Boolean(fieldErrors.startDate)}
            aria-describedby={fieldErrors.startDate ? 'season-start-date-error' : undefined}
          />
          {fieldErrors.startDate ? (
            <small id="season-start-date-error" className={styles.fieldError}>{fieldErrors.startDate}</small>
          ) : null}
        </label>
        <label>
          <span>End date</span>
          <input
            name="endDate"
            type="date"
            value={values.endDate}
            onChange={(event) => setTextField('endDate', event.target.value)}
            aria-invalid={Boolean(fieldErrors.endDate)}
            aria-describedby={fieldErrors.endDate ? 'season-end-date-error' : undefined}
          />
          {fieldErrors.endDate ? (
            <small id="season-end-date-error" className={styles.fieldError}>{fieldErrors.endDate}</small>
          ) : null}
        </label>
        <label>
          <span>Men’s roster cap per team</span>
          <input
            name="mensRosterCap"
            type="number"
            inputMode="numeric"
            min="1"
            value={values.mensRosterCap}
            disabled={rosterRulesLocked}
            onChange={(event) => setRosterCap('mensRosterCap', event.target.value)}
            aria-invalid={Boolean(fieldErrors.mensRosterCap)}
          />
          {fieldErrors.mensRosterCap ? (
            <small className={styles.fieldError}>{fieldErrors.mensRosterCap}</small>
          ) : null}
        </label>
        <label>
          <span>Women’s roster cap per team</span>
          <input
            name="womensRosterCap"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="Unlimited"
            value={values.womensRosterCap}
            disabled={rosterRulesLocked}
            onChange={(event) => setRosterCap('womensRosterCap', event.target.value)}
            aria-invalid={Boolean(fieldErrors.womensRosterCap)}
          />
          {fieldErrors.womensRosterCap ? (
            <small className={styles.fieldError}>{fieldErrors.womensRosterCap}</small>
          ) : null}
        </label>
        <label>
          <span>Junior roster cap per team</span>
          <input
            name="juniorRosterCap"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="Unlimited"
            value={values.juniorRosterCap}
            disabled={rosterRulesLocked}
            onChange={(event) => setRosterCap('juniorRosterCap', event.target.value)}
            aria-invalid={Boolean(fieldErrors.juniorRosterCap)}
          />
          {fieldErrors.juniorRosterCap ? (
            <small className={styles.fieldError}>{fieldErrors.juniorRosterCap}</small>
          ) : null}
        </label>
        {rosterRulesLocked ? (
          <p className={styles.fullField} role="status">
            Roster caps are locked because this season’s first published match has started.
          </p>
        ) : null}
        <label className={styles.fullField}>
          <span>Description</span>
          <textarea
            name="description"
            rows={4}
            value={values.description}
            onChange={(event) => setTextField('description', event.target.value)}
          />
        </label>
        <div className={styles.toggleGroup}>
          <label className={styles.checkboxControl}>
            <input
              name="registrationOpen"
              type="checkbox"
              checked={values.registrationOpen}
              onChange={(event) => setBooleanField('registrationOpen', event.target.checked)}
            />
            <span>Registration open</span>
          </label>
          <label className={styles.checkboxControl}>
            <input
              name="published"
              type="checkbox"
              checked={values.published}
              onChange={(event) => setBooleanField('published', event.target.checked)}
            />
            <span>Published</span>
          </label>
        </div>
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

function optionalNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}
