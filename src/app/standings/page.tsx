import {Footer, SiteHeader} from '@/components/SiteHeader';
import {services} from '@/core/ServiceContainer';

function formatRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

export default async function Page() {
  const activeSeason = await services.seasons.getActive();
  const teams = await services.teams.getAll({status: 'active'});
  const standings = activeSeason
    ? await Promise.all(teams.map(async (team) => ({
      team,
      stats: await services.statistics.getTeamStatistics(team.id, activeSeason.id),
    })))
    : [];

  standings.sort((left, right) =>
    right.stats.record.wins - left.stats.record.wins
    || right.stats.pointsPercentage - left.stats.pointsPercentage
    || right.stats.pointDifferential - left.stats.pointDifferential
    || right.stats.pointsFor - left.stats.pointsFor,
  );

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
          {standings.map(({team, stats}, index) => (
            <div className="standings-row" key={team.id}>
              <span><b>{index + 1}</b>{team.name}</span>
              <span>{formatRecord(stats.record)}</span>
              <span>{stats.pointDifferential > 0 ? `+${stats.pointDifferential}` : stats.pointDifferential}</span>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
