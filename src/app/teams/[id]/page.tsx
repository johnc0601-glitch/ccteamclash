import Link from 'next/link';
import {notFound} from 'next/navigation';
import {PublicPlayerDirectory} from '@/components/players/PublicPlayerDirectory';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {TeamBanner} from '@/components/teams/TeamBanner';
import {services} from '@/core/ServiceContainer';
import {getHistoricalTeamSeasonSummaries, getHistoricalTeamSeedSummary} from '@/data/historicalSeed';
import type {RecordSummary} from '@/services/statistics';
import styles from './TeamDetail.module.css';

type TeamPageProps = {
  params: Promise<{id: string}>;
};

function formatRecord(record: RecordSummary): string {
  return record.ties
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

export async function generateStaticParams() {
  const teams = await services.teams.getAll({status: 'active'});
  return teams.map((team) => ({id: team.id}));
}

export default async function TeamPage({params}: TeamPageProps) {
  const {id} = await params;
  const team = await services.teams.getById(id);
  if (!team?.active) notFound();

  const [activeSeason, seasons, roster, courses] = await Promise.all([
    services.seasons.getActive(),
    services.seasons.getAll(),
    services.publicPlayers.getAll(team.id),
    services.courses.getAll({status: 'active'}),
  ]);
  const publishedSeasons = seasons.filter((season) => season.published);
  const seasonStatistics = await Promise.all(publishedSeasons.map(async (season) => ({
    season,
    statistics: await services.statistics.getTeamStatistics(team.id, season.id),
  })));
  const currentStatistics = activeSeason
    ? seasonStatistics.find(({season}) => season.id === activeSeason.id)?.statistics
      ?? await services.statistics.getTeamStatistics(team.id, activeSeason.id)
    : undefined;
  const historicalStatistics = getHistoricalTeamSeedSummary(team.id);
  const displayStatistics = historicalStatistics ?? currentStatistics;
  const historicalHistory = getHistoricalTeamSeasonSummaries(team.id);
  const history = seasonStatistics.filter(({statistics}) => statistics.matchesPlayed > 0);
  const homeCourse = courses.find((course) => course.name === team.homeCourse);

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <div className="shell">
          <Link className={styles.back} href="/teams">Back to teams</Link>
          <TeamBanner team={team} />

          <section className={styles.overview}>
            <div className={styles.recordBlock}>
              <span>{historicalStatistics?.seasonName ?? activeSeason?.name ?? 'Current season'}</span>
              <strong>{displayStatistics ? formatRecord(displayStatistics.record) : '0-0'}</strong>
              <small>{historicalStatistics ? 'All-time record' : 'Current record'}</small>
            </div>
            <dl>
              <div><dt>Matches</dt><dd>{displayStatistics?.matchesPlayed ?? 0}</dd></div>
              <div><dt>Points %</dt><dd>{(displayStatistics?.pointsPercentage ?? 0).toFixed(1)}%</dd></div>
              <div><dt>Streak</dt><dd>{historicalStatistics ? '--' : currentStatistics?.currentStreak ?? '--'}</dd></div>
            </dl>
            <div className={styles.teamInfo}>
              <p><span>Captain</span><strong>{team.captain || 'To be announced'}</strong></p>
              <p><span>Home course</span><strong>{team.homeCourse || 'To be announced'}</strong></p>
              {homeCourse ? <a href={homeCourse.mapUrl} target="_blank" rel="noreferrer">Open directions</a> : null}
            </div>
          </section>

          {team.description ? <p className={styles.description}>{team.description}</p> : null}

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <span>Current team</span>
              <h2>Roster</h2>
              <p>{roster.length} {roster.length === 1 ? 'player' : 'players'}</p>
            </header>
            <PublicPlayerDirectory
              players={roster}
              showFilters={false}
            />
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <span>League record</span>
              <h2>Season history</h2>
            </header>
            {historicalHistory.length ? (
              <div className={styles.historyWrap}>
                <table>
                  <thead><tr><th>Season</th><th>Matches</th><th>Record</th><th>Points %</th></tr></thead>
                  <tbody>{historicalHistory.map((entry) => (
                    <tr key={entry.seasonId}>
                      <td><strong>{entry.seasonName}</strong></td>
                      <td>{entry.matchesPlayed}</td>
                      <td>{formatRecord(entry.record)}</td>
                      <td>{entry.pointsPercentage.toFixed(1)}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : history.length ? (
              <div className={styles.historyWrap}>
                <table>
                  <thead><tr><th>Season</th><th>Matches</th><th>Record</th><th>Points %</th></tr></thead>
                  <tbody>{history.map(({season, statistics}) => (
                    <tr key={season.id}>
                      <td><strong>{season.name}</strong></td>
                      <td>{statistics.matchesPlayed}</td>
                      <td>{formatRecord(statistics.record)}</td>
                      <td>{statistics.pointsPercentage.toFixed(1)}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className={styles.empty}>No published season history yet.</p>}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
