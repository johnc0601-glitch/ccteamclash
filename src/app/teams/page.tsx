import {Footer, SiteHeader} from '@/components/SiteHeader';
import {PublicTeamGrid} from '@/components/teams/PublicTeamGrid';
import {getPublicDirectoryData} from '@/services/public/PublicDirectoryDataService';
import styles from './Teams.module.css';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const {teams, activeSeasonName} = await getPublicDirectoryData();

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">The league</span>
        <h1>Teams</h1>
        <p className="intro">Current teams, rosters, records, and season history.</p>
        <PublicTeamGrid
          initialTeams={teams}
          activeSeasonName={activeSeasonName}
        />
      </main>
      <Footer />
    </>
  );
}
