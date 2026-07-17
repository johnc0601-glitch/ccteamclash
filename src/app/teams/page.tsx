import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {TeamLogo} from '@/components/teams/TeamLogo';
import {services} from '@/core/ServiceContainer';
import type {RecordSummary} from '@/services/statistics/StatisticsTypes';
import styles from './Teams.module.css';

function formatRecord(record: RecordSummary): string {
  return record.ties
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

export default async function TeamsPage() {
  const [teams, activeSeason] = await Promise.all([
    services.teams.getAll({status: 'active'}),
    services.seasons.getActive(),
  ]);
  const statistics = activeSeason
    ? await Promise.all(teams.map((team) =>
      services.statistics.getTeamStatistics(team.id, activeSeason.id)))
    : [];
  const statisticsByTeam = new Map(statistics.map((entry) => [entry.teamId, entry]));

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">The league</span>
        <h1>Teams</h1>
        <p className="intro">Current teams, rosters, records, and season history.</p>
        <div className={styles.grid}>
          {teams.map((team) => {
            const teamStatistics = statisticsByTeam.get(team.id);
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
                  <strong>{teamStatistics ? formatRecord(teamStatistics.record) : '0-0'}</strong>
                  <small>{activeSeason?.name ?? 'Current season'}</small>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
