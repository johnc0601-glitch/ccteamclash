'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
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

export function PublicTeamGrid({initialTeams, activeSeasonName}: PublicTeamGridProps) {
  const [teams, setTeams] = useState(initialTeams);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/teams?status=active', {cache: 'no-store'})
      .then((response) => response.json() as Promise<{teams?: Team[]}>)
      .then((payload) => {
        if (!cancelled) setTeams(payload.teams ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
