import {Footer, SiteHeader} from '@/components/SiteHeader';
import {services} from '@/core/ServiceContainer';
import styles from './Courses.module.css';

export default async function CoursesPage() {
  const courses = await services.courses.getAll({status: 'active'});

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">League travel</span>
        <h1>Courses</h1>
        <p className="intro">Directions to every active CC Team Clash course.</p>
        <div className={styles.directory}>
          {courses.map((course) => (
            <article className={styles.course} key={course.id}>
              <div>
                <h2>{course.name}</h2>
                <p>{course.address || `${course.city}, ${course.state}`}</p>
                {course.address ? <small>{course.city}, {course.state}</small> : null}
              </div>
              <div className={styles.actions}>
                <a className={styles.primaryAction} href={course.mapUrl} target="_blank" rel="noreferrer">Open directions</a>
                {course.udiscUrl ? <a href={course.udiscUrl} target="_blank" rel="noreferrer">View on UDisc</a> : null}
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
