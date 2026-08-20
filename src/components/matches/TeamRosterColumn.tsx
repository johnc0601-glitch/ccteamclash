import Image from 'next/image';
import Link from 'next/link';
import type {PublicMatchdayTeam} from '@/services/matches/MatchdayService';
import styles from '@/app/matches/[id]/Matchday.module.css';

export function TeamRosterColumn({team, label}: {team: PublicMatchdayTeam; label: string}) {
  const heading = (
    <>
      <TeamLogo name={team.name} logo={team.logo} />
      <div>
        <span>{label}</span>
        <h3>{team.name}</h3>
      </div>
    </>
  );

  return (
    <article className={styles.rosterTeam}>
      {team.team ? (
        <Link className={styles.rosterTeamHeader} href={`/teams/${team.id}`}>{heading}</Link>
      ) : (
        <div className={styles.rosterTeamHeader}>{heading}</div>
      )}
      <div className={styles.rosterTitle}>
        <span>Active roster</span>
        <span>{team.roster.length}</span>
      </div>
      <div className={styles.playerList}>
        {team.roster.length ? team.roster.map((player) => (
          <div className={styles.playerRow} key={player.id}>
            <b>{initials(player.name)}</b>
            <strong>{player.name}</strong>
            {player.clashIndex != null ? <span>Clash Index: {player.clashIndex}</span> : null}
          </div>
        )) : <p className={styles.empty}>No active players are assigned to this team.</p>}
      </div>
    </article>
  );
}

function TeamLogo({name, logo}: {name: string; logo: string}) {
  return (
    <span className={styles.logo}>
      {logo ? <Image src={logo} alt={`${name} logo`} width={72} height={72} /> : initials(name)}
    </span>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
