import {Footer, SiteHeader} from '@/components/SiteHeader';
import {getLatestHistoricalSeasonName, getLatestHistoricalTeamStandings} from '@/data/historicalSeed';

function formatRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

export default async function Page() {
  const seasonName = getLatestHistoricalSeasonName();
  const standings = getLatestHistoricalTeamStandings();

  return (
    <>
      <SiteHeader />
      <main className="shell page-shell">
        <span className="eyebrow">{seasonName}</span>
        <h1>Standings</h1>
        <div className="standings-card full">
          <div className="table-head">
            <span>Rank / Team</span>
            <span>Record</span>
            <span>Points %</span>
          </div>
          {standings.map((standing) => (
            <div className="standings-row" key={standing.teamId}>
              <span><b>{standing.rank}</b>{standing.teamName}</span>
              <span>{formatRecord(standing.record)}</span>
              <span>{standing.pointsPercentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
