import type {PublicMatchday} from '@/services/matches/MatchdayService';
import styles from '@/app/matches/[id]/Matchday.module.css';

export function MatchHero({matchday}: {matchday: PublicMatchday}) {
  const coursePhoto = getCoursePhotoUrl(matchday.courseDetails?.photoUrl ?? '');
  const courseName = matchday.courseDetails?.name ?? 'Course details pending';

  return (
    <section className={styles.hero}>
      <div
        className={styles.heroPhoto}
        style={coursePhoto ? {
          backgroundImage: `linear-gradient(90deg, rgba(5, 9, 10, .22), rgba(5, 9, 10, .78)), url(${coursePhoto})`,
        } : undefined}
        aria-label={`${courseName} event backdrop`}
      />
      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>Matchday</span>
        <h1>{matchday.awayTeam.name} at {matchday.homeTeam.name}</h1>
        <div className={styles.metaLine}>
          <span>{matchday.date}</span>
          <span>{matchday.time}</span>
          {matchday.courseDetails?.mapUrl ? (
            <a href={matchday.courseDetails.mapUrl} target="_blank" rel="noreferrer">
              {courseName}
            </a>
          ) : <span>{courseName}</span>}
        </div>
      </div>
    </section>
  );
}

function getCoursePhotoUrl(url: string): string {
  const cleanedUrl = url.trim();
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(cleanedUrl) ? cleanedUrl : '';
}
