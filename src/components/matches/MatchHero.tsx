import type {PublicMatchday} from '@/services/matches/MatchdayService';
import styles from './MatchHeroV1.module.css';

// Matchday theme colors are applied by the hero stylesheet for the current preview experiment.
export function MatchHero({matchday}: {matchday: PublicMatchday}) {
  const courseName = matchday.courseDetails?.name ?? 'Course details pending';

  return (
    <section className={styles.matchHero} data-matchday-hero>
      <div className={styles.heroTeams}>
        <TeamSide name={matchday.awayTeam.name} logo={matchday.awayTeam.logo} side="away" />
        <div className={styles.heroVs}>VS</div>
        <TeamSide name={matchday.homeTeam.name} logo={matchday.homeTeam.logo} side="home" />
      </div>
      <div className={`${styles.heroMeta} matchday-hero-meta`}>
        <span>{matchday.date}</span>
        <span>{matchday.time}</span>
        {matchday.courseDetails?.mapUrl ? <a href={matchday.courseDetails.mapUrl} target="_blank" rel="noreferrer">{courseName}</a> : <span>{courseName}</span>}
        <span className={styles.weatherSlot}>Weather closer to match</span>
      </div>
    </section>
  );
}

function TeamSide({name, logo, side}: {name: string; logo: string; side: 'away' | 'home'}) {
  return (
    <div className={styles.heroTeam} data-side={side}>
      {logo ? <img src={logo} alt={`${name} logo`} className={styles.heroLogo} /> : <div className={styles.heroLogoFallback}>{initials(name)}</div>}
      <strong>{name}</strong>
      <span>{side === 'away' ? 'Away' : 'Home'}</span>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
