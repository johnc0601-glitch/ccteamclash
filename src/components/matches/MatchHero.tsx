import type {PublicMatchday} from '@/services/matches/MatchdayService';
import {LiveScoringLink} from './LiveScoringLink';
import styles from './MatchHeroV1.module.css';

export function MatchHero({
  matchday,
  roundLabel,
  liveScoringHref,
}: {
  matchday: PublicMatchday;
  roundLabel?: string;
  liveScoringHref?: string;
}) {
  const courseName = matchday.courseDetails?.name ?? 'Course details pending';

  return (
    <section className={styles.matchHero} data-matchday-hero>
      <div className={styles.heroTeams}>
        <div className={styles.heroLabel}>
          <span>Team Matchday</span>
          {roundLabel ? <strong>{roundLabel}</strong> : null}
        </div>

        <TeamSide name={matchday.awayTeam.name} logo={matchday.awayTeam.logo} side="away" />
        <div className={styles.heroVs}>VS</div>
        <TeamSide name={matchday.homeTeam.name} logo={matchday.homeTeam.logo} side="home" />

        <div className={styles.centerGlow} aria-hidden="true" />
      </div>

      <div className={`${styles.heroMeta} matchday-hero-meta`}>
        <span>{matchday.date}</span>
        <span>{matchday.time}</span>
        {matchday.courseDetails?.mapUrl
          ? <a href={matchday.courseDetails.mapUrl} target="_blank" rel="noreferrer">{courseName}</a>
          : <span>{courseName}</span>}
        {liveScoringHref ? <LiveScoringLink href={liveScoringHref} matchup={`${matchday.awayTeam.name} at ${matchday.homeTeam.name}`} matchDate={matchday.scheduledDate ?? ''} /> : null}
      </div>
    </section>
  );
}

function TeamSide({name, logo, side}: {name: string; logo: string; side: 'away' | 'home'}) {
  return (
    <div className={styles.heroTeam} data-side={side}>
      {logo
        ? <img src={logo} alt={`${name} logo`} className={styles.heroLogo} />
        : <div className={styles.heroLogoFallback}>{initials(name)}</div>}
      <strong>{name}</strong>
      <span>{side === 'away' ? 'Away' : 'Home'}</span>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
