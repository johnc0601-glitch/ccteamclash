import {Footer, SiteHeader} from '@/components/SiteHeader';
import {PlayoffBracket} from '@/components/playoffs/PlayoffBracket';
import {createServerPlayoffService} from '@/core/createServerPlayoffService';
import {createServerStandingsService} from '@/core/createServerStandingsService';

export const dynamic = 'force-dynamic';

export default async function PlayoffsPage() {
  const active = await (await createServerStandingsService()).getActiveSeasonStandings();
  const view = active
    ? await (await createServerPlayoffService()).getBracket(active.season.id, true)
    : undefined;
  return (
    <>
      <SiteHeader />
      <main className="shell page-shell">
        <span className="eyebrow">Team Clash postseason</span>
        <h1>Playoffs</h1>
        {view ? <PlayoffBracket view={view} /> : <p>The playoff bracket has not been published.</p>}
      </main>
      <Footer />
    </>
  );
}
