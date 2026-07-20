import {Footer, SiteHeader} from '@/components/SiteHeader';
import {PublicTeamGrid} from '@/components/teams/PublicTeamGrid';
import {services} from '@/core/ServiceContainer';
import styles from './Teams.module.css';

export default async function TeamsPage() {
  const [teams, activeSeason] = await Promise.all([
    services.teams.getAll({status: 'active'}),
    services.seasons.getActive(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">The league</span>
        <h1>Teams</h1>
        <p className="intro">Current teams, rosters, records, and season history.</p>
        <PublicTeamGrid
          initialTeams={teams}
          activeSeasonName={activeSeason?.name ?? 'Current season'}
        />
      </main>
      <Footer />
    </>
  );
}
