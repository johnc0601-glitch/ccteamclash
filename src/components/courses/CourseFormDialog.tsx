'use client';

import {useState, type FormEvent} from 'react';
import {DialogShell} from '@/components/teams/DialogShell';
import type {Course, CourseFieldErrors, CourseInput} from '@/domain/course/Course';
import styles from './CourseManagement.module.css';

type CourseFormDialogProps = {
  course?: Course;
  fieldErrors: CourseFieldErrors;
  submitting: boolean;
  onSubmit: (input: CourseInput) => void;
  onClose: () => void;
};

const EMPTY_INPUT: CourseInput = {
  name: '',
  city: '',
  state: 'NC',
  address: '',
  mapUrl: '',
  udiscUrl: '',
  homeTeamId: undefined,
};

export function CourseFormDialog({course, fieldErrors, submitting, onSubmit, onClose}: CourseFormDialogProps) {
  const [values, setValues] = useState<CourseInput>(course ? {
    name: course.name,
    city: course.city,
    state: course.state,
    address: course.address,
    mapUrl: course.mapUrl,
    udiscUrl: course.udiscUrl,
    homeTeamId: course.homeTeamId,
  } : EMPTY_INPUT);

  function update(field: keyof CourseInput, value: string) {
    setValues((current) => ({...current, [field]: value}));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <DialogShell
      title={course ? 'Edit course' : 'Add course'}
      eyebrow="Course directory"
      onClose={onClose}
      size="large"
    >
      <form className={styles.courseForm} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <label className={styles.fullWidth}>
            <span>Course name</span>
            <input data-initial-focus value={values.name} onChange={(event) => update('name', event.target.value)} aria-invalid={Boolean(fieldErrors.name)} />
            {fieldErrors.name ? <small>{fieldErrors.name}</small> : null}
          </label>
          <label>
            <span>City</span>
            <input value={values.city} onChange={(event) => update('city', event.target.value)} aria-invalid={Boolean(fieldErrors.city)} />
            {fieldErrors.city ? <small>{fieldErrors.city}</small> : null}
          </label>
          <label>
            <span>State</span>
            <input value={values.state} maxLength={2} onChange={(event) => update('state', event.target.value)} aria-invalid={Boolean(fieldErrors.state)} />
            {fieldErrors.state ? <small>{fieldErrors.state}</small> : null}
          </label>
          <label className={styles.fullWidth}>
            <span>Street address <em>Optional</em></span>
            <input value={values.address} onChange={(event) => update('address', event.target.value)} />
          </label>
          <label className={styles.fullWidth}>
            <span>Google Maps link</span>
            <input type="url" value={values.mapUrl} onChange={(event) => update('mapUrl', event.target.value)} aria-invalid={Boolean(fieldErrors.mapUrl)} placeholder="https://maps.google.com/..." />
            {fieldErrors.mapUrl ? <small>{fieldErrors.mapUrl}</small> : null}
          </label>
          <label className={styles.fullWidth}>
            <span>UDisc link <em>Optional</em></span>
            <input type="url" value={values.udiscUrl} onChange={(event) => update('udiscUrl', event.target.value)} aria-invalid={Boolean(fieldErrors.udiscUrl)} placeholder="https://udisc.com/courses/..." />
            {fieldErrors.udiscUrl ? <small>{fieldErrors.udiscUrl}</small> : null}
          </label>
        </div>
        <div className={styles.formActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.primaryButton} disabled={submitting}>{submitting ? 'Saving...' : 'Save course'}</button>
        </div>
      </form>
    </DialogShell>
  );
}
