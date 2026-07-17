import {PublicPlayerDirectory} from '@/components/players/PublicPlayerDirectory';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {services} from '@/core/ServiceContainer';
import styles from './Players.module.css';

export default async function PlayersPage() {
  const [playerViews, teams] = await Promise.all([
    services.publicPlayers.getAll(),
    services.teams.getAll(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">League players</span>
        <h1>Players</h1>
        <p className="intro">Open a player to view current-season stats, career totals, and match history.</p>
        <PublicPlayerDirectory players={playerViews} teams={teams.map(({id, name}) => ({id, name}))} />
      </main>
      <Footer />
    </>
  );
}
