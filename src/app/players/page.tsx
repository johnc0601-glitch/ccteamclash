import {PublicPlayerDirectory} from '@/components/players/PublicPlayerDirectory';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createServerPublicPlayerService} from '@/core/createServerPublicPlayerService';
import styles from './Players.module.css';

type PlayersPageProps = {
  searchParams: Promise<{search?: string | string[]}>;
};

export default async function PlayersPage({searchParams}: PlayersPageProps) {
  const playerViews = await (await createServerPublicPlayerService()).getAll();
  const query = await searchParams;
  const initialSearch = Array.isArray(query.search) ? query.search[0] : query.search;

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">League players</span>
        <h1>Players</h1>
        <p className="intro">Search for a player, then open their row for season stats, career totals, and match history.</p>
        <PublicPlayerDirectory
          players={playerViews}
          initialMode="search"
          initialSearch={initialSearch ?? ''}
          showRankingsLink
        />
      </main>
      <Footer />
    </>
  );
}
