import Link from 'next/link';
import {notFound} from 'next/navigation';
import {PublicPlayerDirectory} from '@/components/players/PublicPlayerDirectory';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {ClientTeamBanner} from '@/components/teams/ClientTeamBanner';
import {services} from '@/core/ServiceContainer';
import {getHistoricalTeamSeasonSummaries, getHistoricalTeamSeedSummary} from '@/data/historicalSeed';
import {getStoredCourses} from '@/services/courses/CourseStore';
import {getStoredTeamById, getStoredTeams} from '@/services/teams/TeamStore';
import type {RecordSummary} from '@/services/statistics';
import styles from './TeamDetail.module.css';

export const dynamic = 'force-dynamic';

type TeamPageProps = {
  params: Promise<{id: string}>;
};

function formatRecord(record: RecordSummary): string {
  return record.ties
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

export async function generateStaticParams() {
  const teams = await getStoredTeams({status: 'active'});
  return teams.map((team) => ({id: team.id}));
}

export default async function TeamPage({params}: TeamPageProps) {
  const {id} = await params;
  const team = await getStoredTeamById(id);
  if (!team?.active) notFound();

  const [activeSeason, seasons, roster, courses] = await Promise.all([
    services.seasons.getActive(),
    services.seasons.getAll(),
    services.publicPlayers.getAll(team.id),
    getStoredCourses({status: 'active'}),
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
  const homeCourses = courses.filter((course) =>
    team.homeCourse && sameCourse(team.homeCourse, course.name));
  const displayedHomeCourseName = homeCourses[0]?.name ?? team.homeCourse;

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <div className="shell">
          <Link className={styles.back} href="/teams">Back to teams</Link>
          <ClientTeamBanner initialTeam={team} />

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
              <p><span>Home course</span><strong>{displayedHomeCourseName || 'To be announced'}</strong></p>
              {homeCourses.length ? (
                <div className={styles.courseLinks}>
                  {homeCourses.map((course) => (
                    <div key={course.id}>
                      {homeCourses.length > 1 ? <small>{course.name}</small> : null}
                      <a href={course.mapUrl} target="_blank" rel="noreferrer">Directions</a>
                      {course.udiscUrl ? <a href={course.udiscUrl} target="_blank" rel="noreferrer">UDisc</a> : null}
                    </div>
                  ))}
                </div>
              ) : null}
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

function sameCourse(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}
