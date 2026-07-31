import {useState, type FormEvent} from 'react';
import type {Course} from '@/domain/course/Course';
import type {Match, MatchInput} from '@/domain/schedule/Match';
import type {RoundInput} from '@/domain/schedule/Round';
import type {ScheduleFieldErrors} from '@/domain/schedule/Schedule';
import type {Team} from '@/models/Team';
import styles from './ScheduleManagement.module.css';

export type RoundMatchValues = {
  id: Match['id'];
  input: MatchInput;
};

type RoundFormProps = {
  initialValues: RoundInput;
  initialMatches?: RoundMatchValues[];
  teams?: Team[];
  courses?: Course[];
  fieldErrors: ScheduleFieldErrors;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: RoundInput, matches: RoundMatchValues[]) => void;
  onCancel: () => void;
};

export function RoundForm({
  initialValues,
  initialMatches = [],
  teams = [],
  courses = [],
  fieldErrors,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: RoundFormProps) {
  const [values, setValues] = useState({...initialValues, number: String(initialValues.number)});
  const [matches, setMatches] = useState(initialMatches);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({...values, number: Number(values.number)}, matches);
  }

  function setMatchField<K extends keyof MatchInput>(
    matchId: string,
    field: K,
    value: MatchInput[K],
  ) {
    setMatches((current) => current.map((match) => match.id === matchId
      ? {id: match.id, input: {...match.input, [field]: value}}
      : match));
  }

  function getMatchError(matchId: string, field: keyof MatchInput): string | undefined {
    return fieldErrors[`matches.${matchId}.${field}`];
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
            value={values.date ?? ''}
            onChange={(event) => setValues((current) => ({...current, date: event.target.value}))}
            aria-invalid={Boolean(fieldErrors.date)}
          />
          {fieldErrors.date ? <small className={styles.fieldError}>{fieldErrors.date}</small> : null}
        </label>
      </div>
      {matches.length ? (
        <section className={styles.roundMatches} aria-labelledby="round-matches-title">
          <header className={styles.roundMatchesHeader}>
            <div>
              <span>Matchups</span>
              <h3 id="round-matches-title">{matches.length} {matches.length === 1 ? 'match' : 'matches'}</h3>
            </div>
            <p>Assign each team once for this round.</p>
          </header>
          <div className={styles.roundMatchList}>
            {matches.map((match, index) => (
              <fieldset key={match.id} className={styles.roundMatch}>
                <legend>Match {index + 1}</legend>
                <div className={styles.roundMatchGrid}>
                  <label>
                    <span>Home team</span>
                    <select
                      value={match.input.homeTeamId ?? ''}
                      onChange={(event) => setMatchField(match.id, 'homeTeamId', event.target.value)}
                      aria-invalid={Boolean(getMatchError(match.id, 'homeTeamId'))}
                    >
                      <option value="">Select home team</option>
                      {teams.filter((team) => team.active).map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                    {getMatchError(match.id, 'homeTeamId') ? (
                      <small className={styles.fieldError}>{getMatchError(match.id, 'homeTeamId')}</small>
                    ) : null}
                  </label>
                  <label>
                    <span>Away team</span>
                    <select
                      value={match.input.awayTeamId ?? ''}
                      onChange={(event) => setMatchField(match.id, 'awayTeamId', event.target.value)}
                      aria-invalid={Boolean(getMatchError(match.id, 'awayTeamId'))}
                    >
                      <option value="">Select away team</option>
                      {teams.filter((team) => team.active).map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                    {getMatchError(match.id, 'awayTeamId') ? (
                      <small className={styles.fieldError}>{getMatchError(match.id, 'awayTeamId')}</small>
                    ) : null}
                  </label>
                  <label className={styles.roundMatchCourse}>
                    <span>Course</span>
                    <select
                      value={match.input.courseId ?? ''}
                      onChange={(event) => setMatchField(match.id, 'courseId', event.target.value)}
                      aria-invalid={Boolean(getMatchError(match.id, 'courseId'))}
                    >
                      <option value="">Select course</option>
                      {courses.filter((course) => course.active).map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name} - {course.city}, {course.state}
                        </option>
                      ))}
                    </select>
                    {getMatchError(match.id, 'courseId') ? (
                      <small className={styles.fieldError}>{getMatchError(match.id, 'courseId')}</small>
                    ) : null}
                  </label>
                  <label>
                    <span>Time</span>
                    <input
                      type="time"
                      value={match.input.time ?? ''}
                      onChange={(event) => setMatchField(match.id, 'time', event.target.value)}
                      aria-invalid={Boolean(getMatchError(match.id, 'time'))}
                    />
                    {getMatchError(match.id, 'time') ? (
                      <small className={styles.fieldError}>{getMatchError(match.id, 'time')}</small>
                    ) : null}
                  </label>
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      ) : null}
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.primaryButton} disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
