import {Footer, SiteHeader} from '@/components/SiteHeader';
import {getStoredCourses} from '@/services/courses/CourseStore';
import {getStoredTeams} from '@/services/teams/TeamStore';
import styles from './Courses.module.css';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const [courses, teams] = await Promise.all([
    getStoredCourses({status: 'active'}),
    getStoredTeams({status: 'active'}),
  ]);

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">League travel</span>
        <h1>Courses</h1>
        <p className="intro">League course cards with directions and UDisc course info.</p>
        <div className={styles.directory}>
          {courses.map((course) => {
            const courseTeams = teams.filter((team) =>
              sameCourse(team.homeCourse, course.name));
            const photoUrl = getCoursePhotoUrl(course.photoUrl);
            return (
              <article className={styles.course} key={course.id}>
                <div
                  className={photoUrl ? styles.photo : `${styles.photo} ${styles.photoFallback}`}
                  style={photoUrl ? {backgroundImage: `url(${photoUrl})`} : undefined}
                  aria-label={`${course.name} course photo`}
                >
                  {!photoUrl ? <span>Course photo</span> : null}
                </div>
                <div className={styles.cardBody}>
                  <div>
                    <span className={styles.location}>{course.city}, {course.state}</span>
                    <h2>{course.name}</h2>
                    {courseTeams.length ? <p className={styles.homeTeam}>Teams: {courseTeams.map((team) => team.name).join(', ')}</p> : null}
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

function sameCourse(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function getCoursePhotoUrl(url: string): string {
  const cleanedUrl = url.trim();
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(cleanedUrl) ? cleanedUrl : '';
}
