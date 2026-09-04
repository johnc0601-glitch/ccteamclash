import {Footer, SiteHeader} from '@/components/SiteHeader';
import {getPublicDirectoryData} from '@/services/public/PublicDirectoryDataService';
import styles from './Courses.module.css';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const {courses, teams} = await getPublicDirectoryData();
  const coursesWithPhotos = await Promise.all(courses.map(async (course) => {
    const storedPhotoUrl = getCoursePhotoUrl(course.photoUrl);
    return {
      course,
      photoUrl: storedPhotoUrl || await getUdiscCoursePhotoUrl(course.udiscUrl),
    };
  }));

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">League travel</span>
        <h1>Courses</h1>
        <p className="intro">League course cards with directions and UDisc course info.</p>
        <div className={styles.directory}>
          {coursesWithPhotos.map(({course, photoUrl}) => {
            const courseTeams = teams.filter((team) =>
              sameCourse(team.homeCourse, course.name));
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

async function getUdiscCoursePhotoUrl(udiscUrl: string): Promise<string> {
  const cleanedUrl = udiscUrl.trim();
  if (!cleanedUrl) return '';

  try {
    const courseUrl = new URL(cleanedUrl);
    if (courseUrl.protocol !== 'https:' || !isUdiscHost(courseUrl.hostname)) return '';

    const response = await fetch(courseUrl, {
      cache: 'force-cache',
      next: {revalidate: 86_400},
      signal: AbortSignal.timeout(3_500),
    });
    if (!response.ok) return '';

    const imageUrl = extractSocialImage(await response.text());
    if (!imageUrl) return '';

    const resolvedImageUrl = new URL(imageUrl, response.url);
    return resolvedImageUrl.protocol === 'https:' ? resolvedImageUrl.toString() : '';
  } catch {
    return '';
  }
}

function isUdiscHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLocaleLowerCase();
  return normalizedHostname === 'udisc.com' || normalizedHostname.endsWith('.udisc.com');
}

function extractSocialImage(html: string): string {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const supportedKeys = new Set(['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']);

  for (const tag of metaTags) {
    const key = getMetaAttribute(tag, 'property') || getMetaAttribute(tag, 'name');
    if (!supportedKeys.has(key.toLocaleLowerCase())) continue;

    const content = getMetaAttribute(tag, 'content');
    if (content) return content.replaceAll('&amp;', '&');
  }

  return '';
}

function getMetaAttribute(tag: string, attribute: string): string {
  const match = tag.match(new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match?.[1]?.trim() ?? '';
}
