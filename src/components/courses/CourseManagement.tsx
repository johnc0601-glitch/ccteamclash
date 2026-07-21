'use client';

import {useEffect, useState} from 'react';
import {CourseFormDialog} from '@/components/courses/CourseFormDialog';
import {CourseImportDialog} from '@/components/courses/CourseImportDialog';
import {ConfirmationDialog} from '@/components/teams/ConfirmationDialog';
import {SearchBar} from '@/components/teams/SearchBar';
import {services} from '@/core/ServiceContainer';
import type {
  Course,
  CourseFieldErrors,
  CourseImportInput,
  CourseImportResult,
  CourseInput,
  CourseStatusFilter,
} from '@/domain/course/Course';
import type {Team} from '@/models/Team';
import styles from './CourseManagement.module.css';

type EditorState = {mode: 'create'} | {mode: 'edit'; course: Course} | null;

export function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CourseStatusFilter>('all');
  const [editor, setEditor] = useState<EditorState>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<CourseImportResult | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Course | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CourseFieldErrors>({});
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadCourses() {
      try {
        setLoading(true);
        const nextCourses = await services.courses.getAll({search, status});
        if (!cancelled) {
          setCourses(nextCourses);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setMessage({type: 'error', text: 'Courses could not be loaded.'});
          setLoading(false);
        }
      }
    }
    loadCourses();
    return () => { cancelled = true; };
  }, [revision, search, status]);

  useEffect(() => {
    let cancelled = false;

    services.teams.getAll({status: 'active'}).then((nextTeams) => {
      if (!cancelled) setTeams(nextTeams);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(input: CourseInput) {
    if (!editor) return;
    setSubmitting(true);
    const result = editor.mode === 'create'
      ? await services.courses.create(input)
      : await services.courses.update(editor.course.id, input);
    setSubmitting(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setMessage({type: 'error', text: result.message});
      return;
    }

    setEditor(null);
    setFieldErrors({});
    setMessage({type: 'success', text: editor.mode === 'create' ? 'Course added.' : 'Course updated.'});
    setRevision((current) => current + 1);
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    setSubmitting(true);
    const result = await services.courses.archive(archiveTarget.id);
    setSubmitting(false);
    setArchiveTarget(null);
    setMessage(result.ok
      ? {type: 'success', text: 'Course archived.'}
      : {type: 'error', text: result.message});
    if (result.ok) setRevision((current) => current + 1);
  }

  async function handleRestore(course: Course) {
    setSubmitting(true);
    const result = await services.courses.restore(course.id);
    setSubmitting(false);
    setMessage(result.ok
      ? {type: 'success', text: 'Course restored.'}
      : {type: 'error', text: result.message});
    if (result.ok) setRevision((current) => current + 1);
  }

  async function handleImport(inputs: CourseImportInput[]) {
    setSubmitting(true);
    const result = await services.courses.importCourses(inputs);
    setSubmitting(false);
    setImportResult(result);
    setMessage({
      type: result.skipped.length ? 'error' : 'success',
      text: `${result.created.length} created, ${result.updated.length} updated, ${result.skipped.length} skipped.`,
    });
    setRevision((current) => current + 1);
  }

  function openEditor(nextEditor: EditorState) {
    setFieldErrors({});
    setMessage(null);
    setEditor(nextEditor);
  }

  return (
    <section className={styles.management}>
      <div className={styles.toolbar}>
        <SearchBar value={search} onChange={setSearch} label="Search courses" placeholder="Search course or city" />
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as CourseStatusFilter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => {
            setImportResult(null);
            setImportOpen(true);
          }}>Import</button>
          <button type="button" className={styles.primaryButton} onClick={() => openEditor({mode: 'create'})}>Add course</button>
        </div>
      </div>

      {message ? <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div> : null}

      <div className={styles.listHeader}>
        <span>Course directory</span>
        <h2>{courses.length} {courses.length === 1 ? 'course' : 'courses'}</h2>
        <p>Directions for league travel. Course details remain on UDisc.</p>
      </div>

      {loading ? <div className={styles.state}>Loading courses...</div> : null}
      {!loading && courses.length === 0 ? <div className={styles.state}>No courses found.</div> : null}
      {!loading && courses.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.courseTable}>
            <thead><tr><th>Course</th><th>Location</th><th>Links</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td><strong>{course.name}</strong></td>
                  <td>{course.address ? <><span>{course.address}</span><small>{course.city}, {course.state}</small></> : `${course.city}, ${course.state}`}</td>
                  <td><div className={styles.links}><a href={course.mapUrl} target="_blank" rel="noreferrer">Directions</a>{course.udiscUrl ? <a href={course.udiscUrl} target="_blank" rel="noreferrer">Course info</a> : null}</div></td>
                  <td><span className={course.active ? styles.active : styles.archived}>{course.active ? 'Active' : 'Archived'}</span></td>
                  <td><div className={styles.actions}><button type="button" onClick={() => openEditor({mode: 'edit', course})}>Edit</button>{course.active ? <button type="button" onClick={() => setArchiveTarget(course)}>Archive</button> : <button type="button" disabled={submitting} onClick={() => handleRestore(course)}>Restore</button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editor ? <CourseFormDialog course={editor.mode === 'edit' ? editor.course : undefined} fieldErrors={fieldErrors} submitting={submitting} onSubmit={handleSubmit} onClose={() => setEditor(null)} /> : null}
      {importOpen ? <CourseImportDialog teams={teams} submitting={submitting} result={importResult} onImport={handleImport} onClose={() => setImportOpen(false)} /> : null}
      {archiveTarget ? <ConfirmationDialog title="Archive course?" message={`${archiveTarget.name} will remain on existing schedules but cannot be selected for new matches.`} confirmLabel="Archive course" submitting={submitting} onConfirm={handleArchive} onClose={() => setArchiveTarget(null)} /> : null}
    </section>
  );
}
