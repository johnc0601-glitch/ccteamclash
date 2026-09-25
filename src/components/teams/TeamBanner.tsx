import type {CSSProperties} from 'react';
import type {Team} from '@/models/Team';
import {TeamLogo} from '@/components/teams/TeamLogo';
import styles from './TeamBanner.module.css';

type TeamBannerProps = {
  team: Team;
  height?: number;
  championSeasons?: string[];
};

export function TeamBanner({team, height = 160, championSeasons = []}: TeamBannerProps) {
  const style: CSSProperties = {
    minHeight: height,
    backgroundColor: team.primaryColor,
    backgroundImage: `linear-gradient(120deg, ${team.primaryColor}, ${team.secondaryColor})`,
  };

  return (
    <div className={styles.banner} style={style}>
      <TeamLogo team={team} large />
      <div className={styles.identity}>
        <span>{team.city}, {team.state}</span>
        <strong>{team.name}</strong>
      </div>
      {championSeasons.length ? (
        <div className={styles.championBadges} aria-label="Season championships">
          {championSeasons.slice(0, 3).map((season) => (
            <span className={styles.championBadge} key={season} title={`Season champion ${season}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 3h8v3h3v2c0 3-1.7 5.2-4.6 5.8A5 5 0 0 1 13 15v2h3v2H8v-2h3v-2a5 5 0 0 1-1.4-1.2C6.7 13.2 5 11 5 8V6h3V3Zm0 5H7c0 1.6.6 2.8 1.8 3.5A6.4 6.4 0 0 1 8 8Zm8 0c0 1.3-.3 2.5-.8 3.5C16.4 10.8 17 9.6 17 8h-1Z" />
              </svg>
              <small>{compactSeason(season)}</small>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}


function compactSeason(value: string): string {
  const match = value.match(/(\d{4})\D+(\d{4})/);
  if (!match) return value.replace(/^Coastal Clash Match Play\s*/i, '');
  return `${match[1].slice(2)}–${match[2].slice(2)}`;
}
