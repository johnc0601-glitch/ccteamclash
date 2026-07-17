import {PublicPlayerDirectory, type PublicPlayerView} from '@/components/players/PublicPlayerDirectory';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {services} from '@/core/ServiceContainer';
import styles from './Players.module.css';

export default async function PlayersPage() {
  const [players, teams, seasons, activeSeason] = await Promise.all([
    services.players.getAll({status: 'active'}),
    services.teams.getAll(),
    services.seasons.getAll(),
    services.seasons.getActive(),
  ]);
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));
  const seasonNames = new Map(seasons.map((season) => [season.id, season.name]));

  const playerViews: PublicPlayerView[] = await Promise.all(players.map(async (player) => {
    const [currentStatistics, careerStatistics, history] = await Promise.all([
      activeSeason ? services.statistics.getPlayerStatistics(player.id, activeSeason.id) : undefined,
      services.statistics.getPlayerCareerStatistics(player.id),
      services.statistics.getPlayerMatchHistory(player.id),
    ]);

    return {
      player,
      teamName: teamNames.get(player.teamId) ?? player.teamId,
      currentSeasonName: activeSeason?.name ?? 'Current season',
      currentStatistics,
      careerStatistics,
      history: history.map((entry) => ({
        ...entry,
        opponentTeamName: teamNames.get(entry.opponentTeamId) ?? entry.opponentTeamId,
        seasonName: seasonNames.get(entry.seasonId) ?? entry.seasonId,
      })),
    };
  }));

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
