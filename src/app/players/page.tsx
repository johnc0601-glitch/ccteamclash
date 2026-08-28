import {PublicPlayerDirectory} from '@/components/players/PublicPlayerDirectory';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createServerPublicPlayerService} from '@/core/createServerPublicPlayerService';
import styles from './Players.module.css';

type PlayersPageProps = {
  searchParams: Promise<{
    player?: string | string[];
    search?: string | string[];
  }>;
};

export default async function PlayersPage({searchParams}: PlayersPageProps) {
  const query = await searchParams;
  const initialPlayerId = Array.isArray(query.player) ? query.player[0] : query.player;
  const initialSearch = Array.isArray(query.search) ? query.search[0] : query.search;
  const playerViews = await (await createServerPublicPlayerService()).getAll('all', initialPlayerId);

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
          initialPlayerId={initialPlayerId ?? ''}
          initialSearch={initialSearch ?? ''}
          showRankingsLink
        />
      </main>
      <Footer />
    </>
  );
}
