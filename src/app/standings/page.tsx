import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StandingsTable} from '@/components/standings/StandingsTable';
import {createServerStandingsService} from '@/core/createServerStandingsService';

export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  const standings = await (await createServerStandingsService()).getActiveSeasonStandings();

  return (
    <>
      <SiteHeader />
      <main className="shell page-shell">
        <h1>Standings</h1>
        <section className="season-archive season-archive-current">
          <span className="eyebrow">Current season</span>
          <h2>{standings?.season.name ?? 'No active season'}</h2>
          {standings ? (
            <StandingsTable entries={standings.entries} />
          ) : <p>No active season is available.</p>}
        </section>
      </main>
      <Footer />
    </>
  );
}
