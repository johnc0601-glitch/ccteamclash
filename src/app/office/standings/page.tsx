import Link from 'next/link';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {StandingsTable} from '@/components/standings/StandingsTable';
import {createServerStandingsService} from '@/core/createServerStandingsService';

export default async function OfficeStandingsPage() {
  const standings = await (await createServerStandingsService()).getActiveSeasonStandings();

  return (
    <OfficePage sectionId="standings">
      <section className="office-module-frame">
        <span>Automatic standings</span>
        <h2>{standings?.season.name ?? 'No active season'}</h2>
        <p>
          Published regular-season results only. Ranking order: wins, head-to-head, then points percentage.
        </p>
        <div style={{margin: '22px 0'}}>
          <Link className="office-public-link" href="/office/standings">Refresh standings</Link>
        </div>
        {standings ? (
          <StandingsTable entries={standings.entries} rounds={standings.rounds} />
        ) : <p>No standings are available.</p>}
      </section>
    </OfficePage>
  );
}
