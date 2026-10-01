import type {Course} from '@/domain/course/Course';
import styles from './MatchCourseInfo.module.css';

type LayoutSummary = {
  name: string;
  distance: string;
  par: number;
};

const BURNT_MILL_CREEK_LAYOUTS: LayoutSummary[] = [
  {name: 'Clash Gold', distance: '6,627 ft', par: 58},
  {name: 'Clash Blue', distance: '4,897 ft', par: 57},
];

export function MatchCourseInfo({course}: {course: Course | undefined}) {
  if (!course) return null;

  const location = [course.city, course.state].filter(Boolean).join(', ');
  const layouts = getLayoutSummaries(course);

  return (
    <section className={styles.card} aria-labelledby="match-course-heading">
      <div className={styles.heading}>
        <div className={styles.identity}>
          <span>Course information</span>
          <h2 id="match-course-heading">{course.name}</h2>
          {location ? <strong>{location}</strong> : null}
        </div>

        {layouts.length ? (
          <div className={styles.layouts} aria-label="UDisc course layouts">
            {layouts.map((layout) => (
              <div className={styles.layout} key={layout.name}>
                <span>{layout.name}</span>
                <strong>{layout.distance}</strong>
                <small>Par {layout.par} · UDisc</small>
              </div>
            ))}
          </div>
        ) : null}
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

function getLayoutSummaries(course: Course): LayoutSummary[] {
  const normalized = course.name.toLocaleLowerCase();
  return normalized.includes('burnt mill creek') ? BURNT_MILL_CREEK_LAYOUTS : [];
}
