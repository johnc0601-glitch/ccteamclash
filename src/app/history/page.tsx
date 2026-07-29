import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {
  getHistoricalSeasonArchives,
  isHistoricalFemalePlayer,
  type HistoricalPlayerSeasonSummary,
  type HistoricalTeamSeasonStanding,
} from '@/data/historicalSeed';
import styles from './History.module.css';

function formatTeamRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

function formatPlayerRecord(summary: HistoricalPlayerSeasonSummary): string {
  const {overallRecord} = summary;
  return overallRecord.ties
    ? `${overallRecord.wins}-${overallRecord.losses}-${overallRecord.ties}`
    : `${overallRecord.wins}-${overallRecord.losses}`;
}

export default async function HistoryPage() {
  const archives = getHistoricalSeasonArchives();

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">League archive</span>
        <h1>Season History</h1>
        <p className="intro">Completed and imported Team Clash seasons live here.</p>

        <div className={styles.archiveStack}>
          {archives.map((archive) => {
            const topPlayers = archive.playerSummaries.slice(0, 10);
            const topWomen = archive.playerSummaries
              .filter((summary) => isHistoricalFemalePlayer(summary.playerName))
              .slice(0, 5);

            return (
              <section className={styles.seasonPanel} key={archive.seasonId}>
                <header className={styles.seasonHeader}>
                  <div>
                    <span>{archive.sourceFilename}</span>
                    <h2>{archive.seasonName}</h2>
                  </div>
                  {archive.championTeamName && archive.championTeamId ? (
                    <Link href={`/teams/${archive.championTeamId}`} className={styles.championLink}>
                      <span>Season champion</span>
                      <strong>{archive.championTeamName}</strong>
                    </Link>
                  ) : null}
                </header>

                <div className={styles.archiveGrid}>
                  <StandingsTable standings={archive.standings} />
                  <PlayerTable title="Top players" players={topPlayers} />
                  <PlayerTable title="Top women" players={topWomen} />
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}

function StandingsTable({standings}: {standings: HistoricalTeamSeasonStanding[]}) {
  return (
    <section className={styles.tablePanel}>
      <h3>Final standings</h3>
      <div className={styles.tableWrap}>
        <table>
          <thead><tr><th>#</th><th>Team</th><th>Record</th><th>Pts %</th></tr></thead>
          <tbody>{standings.map((standing) => (
            <tr key={standing.teamId}>
              <td><strong>{standing.rank}</strong></td>
              <td>{standing.teamName}</td>
              <td>{formatTeamRecord(standing.record)}</td>
              <td>{standing.pointsPercentage.toFixed(1)}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

function PlayerTable({title, players}: {title: string; players: HistoricalPlayerSeasonSummary[]}) {
  return (
    <section className={styles.tablePanel}>
      <h3>{title}</h3>
      {players.length ? (
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Player</th><th>Team</th><th>Record</th><th>Win %</th></tr></thead>
            <tbody>{players.map((summary) => (
              <tr key={summary.playerId}>
                <td>{summary.playerName}</td>
                <td>{summary.teamName}</td>
                <td>{formatPlayerRecord(summary)}</td>
                <td>{summary.winPercentage.toFixed(1)}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className={styles.empty}>No qualifying players found.</p>}
    </section>
  );
}
