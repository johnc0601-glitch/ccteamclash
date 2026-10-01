import type {Course} from '@/domain/course/Course';
import styles from './MatchCourseInfo.module.css';

export function MatchCourseInfo({course}: {course: Course | undefined}) {
  if (!course) return null;

  const location = [course.city, course.state].filter(Boolean).join(', ');

  return (
    <section className={styles.card} aria-labelledby="match-course-heading">
      <div className={styles.heading}>
        <div>
          <span>Course information</span>
          <h2 id="match-course-heading">{course.name}</h2>
        </div>
        {location ? <strong>{location}</strong> : null}
      </div>

      <details className={styles.details}>
        <summary>Course details</summary>
        <div className={styles.body}>
          {course.description ? <p>{course.description}</p> : null}
          {course.address ? <p className={styles.address}>{course.address}</p> : null}
          <div className={styles.links}>
            {course.mapUrl ? <a href={course.mapUrl} target="_blank" rel="noreferrer">Directions</a> : null}
            {course.udiscUrl ? <a href={course.udiscUrl} target="_blank" rel="noreferrer">UDisc</a> : null}
          </div>
          <small>Course imagery is intentionally not loaded on Matchday.</small>
        </div>
      </details>
    </section>
  );
}
