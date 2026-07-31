import Link from 'next/link';
import type {TeamStanding} from '@/services/standings';
import styles from './StandingsTable.module.css';

export function StandingsTable({entries}: {entries: TeamStanding[]}) {
  return (
    <div className={styles.table}>
      <div className={styles.header}>
        <span>Rank / Team</span>
        <span>GP</span>
        <span>W</span>
        <span>L</span>
        <span>PF</span>
        <span>PA</span>
        <span>Diff</span>
        <span>Win %</span>
      </div>
      {entries.map((entry) => (
        <div className={styles.row} key={entry.team.id}>
          <span className={styles.team}>
            <b>{entry.rank}</b>
            <Link href={`/teams/${entry.team.id}`}>{entry.team.name}</Link>
          </span>
          <span data-label="Games">{entry.gamesPlayed}</span>
          <span data-label="Wins">{entry.wins}</span>
          <span data-label="Losses">{entry.losses}</span>
          <span data-label="Points for">{entry.pointsFor}</span>
          <span data-label="Points against">{entry.pointsAgainst}</span>
          <span data-label="Differential">{formatDifferential(entry.pointDifferential)}</span>
          <span data-label="Winning percentage">{(entry.winningPercentage * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function formatDifferential(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
