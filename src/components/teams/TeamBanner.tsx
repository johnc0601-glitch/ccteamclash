import type {CSSProperties} from 'react';
import type {Team} from '@/models/Team';
import {TeamLogo} from '@/components/teams/TeamLogo';
import styles from './TeamBanner.module.css';

type TeamBannerProps = {
  team: Team;
  height?: number;
};

export function TeamBanner({team, height = 160}: TeamBannerProps) {
  const style: CSSProperties = {
    minHeight: height,
    backgroundColor: team.primaryColor,
    backgroundImage: `linear-gradient(120deg, ${team.primaryColor}, ${team.secondaryColor})`,
  };

  return (
    <div className={styles.banner} style={style}>
      <TeamLogo team={team} large />
      <div>
        <span>{team.city}, {team.state}</span>
        <strong>{team.name}</strong>
      </div>
    </div>
  );
}
