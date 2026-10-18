import type {CSSProperties} from 'react';
import styles from './RecapMatchdayHeader.module.css';

export type RecapTeam = {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  shortName: string;
};

type Props = {
  homeName: string;
  awayName: string;
  homeScore: string;
  awayScore: string;
  date: string;
  course: string;
  teams?: Record<string, RecapTeam>;
};

// Matchday presents away on the left and home on the right.
// This is a compact, read-only adaptation of its *final* hero.
// Do not import the live Matchday component: those pages contain
// interactive/locked-result behavior that should remain untouched.
export function RecapMatchdayHeader({
  homeName,
  awayName,
  homeScore,
  awayScore,
  date,
  course,
  teams = {},
}: Props) {
  const home = teams[homeName.trim().toLowerCase()];
  const away = teams[awayName.trim().toLowerCase()];
  const homeColor = safeColor(home?.primaryColor);
  const awayColor = safeColor(away?.primaryColor);

  const colors = {
    '--match-away': awayColor,
    '--match-home': homeColor,
  } as CSSProperties;

  return (
    <section
      className={styles.recapHeader}
      style={colors}
      aria-label={`Final result: ${awayName} ${awayScore}, ${homeName} ${homeScore}`}
    >
      <div className={styles.teams}>
        <div className={styles.team} data-side="away">
          <TeamLogo name={awayName} logo={away?.logo} />
          <strong>{awayName}</strong>
          <span>Away</span>
        </div>
        <div className={styles.scoreboard}>
          <span className={styles.final}>Final</span>
          <div className={styles.scores}>
            <strong>{awayScore}</strong>
            <span aria-hidden="true">–</span>
            <strong>{homeScore}</strong>
          </div>
        </div>
        <div className={styles.team} data-side="home">
          <TeamLogo name={homeName} logo={home?.logo} />
          <strong>{homeName}</strong>
          <span>Home</span>
        </div>
      </div>
      <div className={styles.meta}>
        <span>{date}</span>
        <span className={styles.separator} aria-hidden="true">·</span>
        <span>{course}</span>
      </div>
    </section>
  );
}

function TeamLogo({name, logo}: {name: string; logo?: string}) {
  if (logo && (logo.startsWith('/') || /^https:\/\//.test(logo))) {
    return <img className={styles.logo} src={logo} alt={`${name} logo`} loading="lazy" />;
  }
  return <span className={styles.logoFallback} aria-hidden="true">{name.split(/\s+/).map((part) => part[0]).slice(0, 3).join('')}</span>;
}

function safeColor(color: string | undefined): string {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#687782';
}
