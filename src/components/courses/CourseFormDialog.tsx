'use client';

import {useRef, useState, type ChangeEvent, type FormEvent} from 'react';
import {DialogShell} from '@/components/teams/DialogShell';
import type {Course, CourseFieldErrors, CourseInput} from '@/domain/course/Course';
import {createCoursePhotoUrl} from '@/shared/utils';
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
  photoUrl: '',
  description: '',
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
    photoUrl: course.photoUrl,
    description: course.description,
    homeTeamId: course.homeTeamId,
  } : EMPTY_INPUT);
  const [photoError, setPhotoError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(field: keyof CourseInput, value: string) {
    setValues((current) => ({...current, [field]: value}));
  }

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setPhotoUploading(true);
      const photoUrl = await createCoursePhotoUrl(file, values.name || file.name);
      update('photoUrl', photoUrl);
      setPhotoError('');
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Course photo could not be uploaded.');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function clearPhoto() {
    update('photoUrl', '');
    setPhotoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          <label className={styles.fullWidth}>
            <span>Photo link <em>Optional</em></span>
            <input type="url" value={values.photoUrl} onChange={(event) => update('photoUrl', event.target.value)} aria-invalid={Boolean(fieldErrors.photoUrl)} placeholder="https://..." />
            {fieldErrors.photoUrl ? <small>{fieldErrors.photoUrl}</small> : null}
          </label>
          <div className={`${styles.fullWidth} ${styles.photoUploadField}`}>
            <span>Course photo</span>
            <div
              className={styles.photoUploadPreview}
              style={values.photoUrl ? {backgroundImage: `url(${values.photoUrl})`} : undefined}
            >
              {!values.photoUrl ? <span>No course photo</span> : null}
            </div>
            <div className={styles.photoUploadActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()} disabled={photoUploading}>
                {photoUploading ? 'Uploading...' : 'Upload photo'}
              </button>
              {values.photoUrl ? <button type="button" className={styles.secondaryButton} onClick={clearPhoto}>Clear</button> : null}
              <input ref={fileInputRef} className={styles.srOnly} type="file" accept="image/*" onChange={handlePhotoUpload} />
            </div>
            {photoError ? <small>{photoError}</small> : null}
          </div>
          <label className={styles.fullWidth}>
            <span>Description <em>Optional</em></span>
            <textarea className={styles.descriptionInput} value={values.description} onChange={(event) => update('description', event.target.value)} rows={3} />
          </label>
        </div>
        <div className={styles.formActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.primaryButton} disabled={submitting || photoUploading}>{submitting ? 'Saving...' : 'Save course'}</button>
        </div>
      </form>
    </DialogShell>
  );
}
