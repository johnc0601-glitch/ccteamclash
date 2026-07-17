import {Footer, SiteHeader} from '@/components/SiteHeader';
import {services} from '@/core/ServiceContainer';

function formatRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

export default async function Page() {
  const activeSeason = await services.seasons.getActive();
  const standings = activeSeason
    ? await services.standings.getSeasonStandings(activeSeason.id)
    : [];

  return (
    <>
      <SiteHeader />
      <main className="shell page-shell">
        <span className="eyebrow">{activeSeason?.name ?? 'Current Season'}</span>
        <h1>Standings</h1>
        <div className="standings-card full">
          <div className="table-head">
            <span>Rank / Team</span>
            <span>Record</span>
            <span>Diff.</span>
          </div>
          {standings.map(({rank, team, statistics}) => (
            <div className="standings-row" key={team.id}>
              <span><b>{rank}</b>{team.name}</span>
              <span>{formatRecord(statistics.record)}</span>
              <span>{statistics.pointDifferential > 0 ? `+${statistics.pointDifferential}` : statistics.pointDifferential}</span>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
