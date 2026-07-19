import {Footer, SiteHeader} from '@/components/SiteHeader';
import {services} from '@/core/ServiceContainer';
import type {RankingEntry} from '@/services/rankings';
import styles from './Rankings.module.css';

type RankingTableProps = {
  title: string;
  entries: RankingEntry[];
  teamNames: Map<string, string>;
  fullWidth?: boolean;
};

function formatRecord(statistics: RankingEntry['statistics']): string {
  const {wins, losses, ties} = statistics.overallRecord;
  return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function RankingTable({title, entries, teamNames, fullWidth = false}: RankingTableProps) {
  return (
    <section className={`${styles.rankingPanel} ${fullWidth ? styles.rankingPanelFull : ''}`}>
      <header>
        <span>Current rankings</span>
        <h2>{title}</h2>
      </header>
      {entries.length ? (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Team</th>
                <th>Record</th>
                <th>Win %</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(({rank, player, statistics}) => (
                <tr key={player.id}>
                  <td><strong>{rank}</strong></td>
                  <td>{player.name}</td>
                  <td>{teamNames.get(player.teamId) ?? player.teamId}</td>
                  <td>{formatRecord(statistics)}</td>
                  <td>{statistics.winPercentage.toFixed(1)}%</td>
                  <td>{statistics.pointsEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className={styles.emptyState}>No published player results yet.</p>}
    </section>
  );
}

export default async function RankingsPage() {
  const activeSeason = await services.seasons.getActive();
  const teams = await services.teams.getAll({status: 'active'});
  const [overall, women, total] = activeSeason
    ? await Promise.all([
      services.rankings.getOverallRankings(activeSeason.id),
      services.rankings.getWomensRankings(activeSeason.id),
      services.rankings.getTotalRankings(activeSeason.id),
    ])
    : [[], [], []];
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.rankingsPage}`}>
        <span className="eyebrow">{activeSeason?.name ?? 'Current Season'}</span>
        <h1>Player Rankings</h1>
        <div className={styles.rankingsGrid}>
          <RankingTable title="Overall Top 25" entries={overall} teamNames={teamNames} />
          <RankingTable title="Women's Top 10" entries={women} teamNames={teamNames} />
          <RankingTable title="Total Rankings" entries={total} teamNames={teamNames} fullWidth />
        </div>
      </main>
      <Footer />
    </>
  );
}
