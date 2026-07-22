import {Footer, SiteHeader} from '@/components/SiteHeader';
import {services} from '@/core/ServiceContainer';
import {getStoredCourses} from '@/services/courses/CourseStore';
import styles from './Courses.module.css';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const [courses, teams] = await Promise.all([
    getStoredCourses({status: 'active'}),
    services.teams.getAll({status: 'active'}),
  ]);
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">League travel</span>
        <h1>Courses</h1>
        <p className="intro">League course cards with directions and UDisc course info.</p>
        <div className={styles.directory}>
          {courses.map((course) => {
            const homeTeamName = course.homeTeamId ? teamNames.get(course.homeTeamId) : undefined;
            return (
              <article className={styles.course} key={course.id}>
                <div
                  className={course.photoUrl ? styles.photo : `${styles.photo} ${styles.photoFallback}`}
                  style={course.photoUrl ? {backgroundImage: `url(${course.photoUrl})`} : undefined}
                  aria-label={`${course.name} course photo`}
                >
                  {!course.photoUrl ? <span>Course photo</span> : null}
                </div>
                <div className={styles.cardBody}>
                  <div>
                    <span className={styles.location}>{course.city}, {course.state}</span>
                    <h2>{course.name}</h2>
                    {homeTeamName ? <p className={styles.homeTeam}>Home course: {homeTeamName}</p> : null}
                    <p>{course.description || 'Course details and current layout information are maintained on UDisc.'}</p>
                  </div>
                  <div className={styles.actions}>
                    <a className={styles.primaryAction} href={course.mapUrl} target="_blank" rel="noreferrer">Directions</a>
                    {course.udiscUrl ? <a href={course.udiscUrl} target="_blank" rel="noreferrer">UDisc</a> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
