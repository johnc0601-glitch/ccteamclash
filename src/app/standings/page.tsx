import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StandingsTable} from '@/components/standings/StandingsTable';
import {createPublicStandingsService} from '@/core/createPublicStandingsService';

export const revalidate = 21_600;

export default async function StandingsPage() {
  const standings = await createPublicStandingsService().getActiveSeasonStandings();

  return (
    <>
      <SiteHeader />
      <main className="shell page-shell">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap'}}>
          <h1>Standings</h1>
          <Link href="/playoffs">Playoffs →</Link>
        </div>
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
