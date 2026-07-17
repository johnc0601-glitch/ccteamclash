import type {CSSProperties} from 'react';
import type {Team} from '@/models/Team';
import styles from './TeamManagement.module.css';

type TeamLogoProps = {
  team: Team;
  large?: boolean;
};

export function TeamLogo({team, large = false}: TeamLogoProps) {
  const logoStyle: CSSProperties = team.logo
    ? {
        backgroundColor: team.primaryColor,
        backgroundImage: `url(${JSON.stringify(team.logo)})`,
        color: team.secondaryColor,
      }
    : {
        backgroundColor: team.primaryColor,
        color: team.secondaryColor,
      };

  return (
    <span
      className={large ? `${styles.teamLogo} ${styles.teamLogoLarge}` : styles.teamLogo}
      style={logoStyle}
      role="img"
      aria-label={`${team.name} logo`}
    >
      {team.logo ? null : team.shortName}
    </span>
  );
}
