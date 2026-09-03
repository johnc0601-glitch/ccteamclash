import Link from 'next/link';
import {getHistoricalTeamSeedSummary} from '@/data/historicalSeed';
import type {Team} from '@/models/Team';
import type {RecordSummary} from '@/services/statistics/StatisticsTypes';
import {TeamLogo} from '@/components/teams/TeamLogo';
import styles from '@/app/teams/Teams.module.css';

type PublicTeamGridProps = {
  initialTeams: Team[];
  activeSeasonName: string;
};

function formatRecord(record: RecordSummary): string {
  return record.ties
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

/**
 * The public teams page already receives fresh server-rendered team data.
 * Rendering it directly avoids a second no-store /api/teams request and keeps
 * this directory out of the client JavaScript bundle.
 */
export function PublicTeamGrid({initialTeams: teams, activeSeasonName}: PublicTeamGridProps) {
  return (
    <div className={styles.grid}>
      {teams.map((team) => {
        const historicalStatistics = getHistoricalTeamSeedSummary(team.id);
        return (
          <Link
            className={styles.team}
            href={`/teams/${team.id}`}
            key={team.id}
            style={{borderTopColor: team.primaryColor}}
          >
            <TeamLogo team={team} large />
            <div className={styles.teamIdentity}>
              <span>{team.city}, {team.state}</span>
              <h2>{team.name}</h2>
              <p>{team.captain ? `Captain ${team.captain}` : 'Captain to be announced'}</p>
            </div>
            <div className={styles.record}>
              <strong>{historicalStatistics ? formatRecord(historicalStatistics.record) : '0-0'}</strong>
              <small>{historicalStatistics?.seasonName ?? activeSeasonName}</small>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
