import Link from 'next/link';
import {notFound} from 'next/navigation';
import {PublicPlayerDirectory} from '@/components/players/PublicPlayerDirectory';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {ClientTeamBanner} from '@/components/teams/ClientTeamBanner';
import {LazyTeamRosterDirectory} from '@/components/teams/LazyTeamRosterDirectory';
import {services} from '@/core/ServiceContainer';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {
  getHistoricalTeamSeasonSummaries,
  getHistoricalTeamSeasonTitles,
  getHistoricalTeamSeedSummary,
} from '@/data/historicalSeed';
import type {TeamScheduleEvent} from '@/domain/schedule/ScheduleService';
import {getStoredCourses} from '@/services/courses/CourseStore';
import {getStoredTeamById} from '@/services/teams/TeamStore';
import {buildPublicTeamRoster} from '@/services/public/PublicRosterService';
import {buildPublicRosterSummaries} from '@/services/public/PublicRosterSummary';
import type {RecordSummary} from '@/services/statistics';
import {createSlug} from '@/shared/utils';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
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

export default async function TeamPage({params}: TeamPageProps) {
  const {id} = await params;
  const team = await getStoredTeamById(id);
  if (!team?.active) notFound();

  const [activeSeason, seasons, courses, launchPlayers] = await Promise.all([
    services.seasons.getActive(),
    services.seasons.getAll(),
    getStoredCourses({status: 'active'}),
    getLaunchPlayers(),
  ]);
  const currentSeasonName = activeSeason?.name ?? 'Current season';
  const rosterPlayerIds = activeSeason
    ? await getActiveSeasonRosterPlayerIds(activeSeason.id, team.id)
    : new Set<string>();
  const rosterLaunchPlayers = launchPlayers
    ? launchPlayers.filter((player) => player.active && rosterPlayerIds.has(player.id))
    : [];
  const historicalPlayersPromise = launchPlayers
    ? services.publicPlayers.getForPlayerIdentities(
      rosterLaunchPlayers.map(({id: playerId, name}) => ({id: playerId, name})),
    )
    : services.publicPlayers.getAll();
  const scheduleService = await createServerScheduleService();
  const [historicalPlayers, nextMatch, teamEvents] = await Promise.all([
    historicalPlayersPromise,
    scheduleService.getTeamNextEvent(team.id),
    scheduleService.getTeamEvents(team.id),
  ]);
  const roster = launchPlayers
    ? buildPublicTeamRoster(
      launchPlayers,
      historicalPlayers,
      team.id,
      team.name,
      currentSeasonName,
      rosterPlayerIds,
    )
    : historicalPlayers.filter(({player}) => player.teamId === team.id);
  const rosterSummaries = buildPublicRosterSummaries(roster);
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
  const seasonTitles = getHistoricalTeamSeasonTitles(team.id);
  const history = seasonStatistics.filter(({statistics}) => statistics.matchesPlayed > 0);
  const homeCourses = courses.filter((course) =>
    team.homeCourse && sameCourse(team.homeCourse, course.name));
  const displayedHomeCourseName = homeCourses[0]?.name ?? team.homeCourse;
  const courseDirections = new Map(courses.map((course) => [createSlug(course.name), course.mapUrl]));

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <div className="shell">
          <Link className={styles.back} href="/teams">Back to teams</Link>
          <ClientTeamBanner initialTeam={team} />

          {seasonTitles.length ? (
            <section className={styles.championBanner} aria-label="Season championships">
              <span>Season champion</span>
              <strong>{seasonTitles.map((title) => title.seasonName.replace('Coastal Clash Match Play ', '')).join(' / ')}</strong>
              <small>{team.name} won {seasonTitles.length === 1 ? 'this season' : 'these seasons'}.</small>
            </section>
          ) : null}

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
              <span>Team schedule</span>
              <h2>Matchdays</h2>
            </header>
            {nextMatch ? <NextMatchCard event={nextMatch} courseDirections={courseDirections} /> : null}
            <TeamSchedule events={teamEvents} courseDirections={courseDirections} />
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <span>Current team</span>
              <h2>Roster</h2>
              <p>{roster.length} {roster.length === 1 ? 'player' : 'players'}</p>
            </header>
            {activeSeason && launchPlayers ? (
              <LazyTeamRosterDirectory
                players={rosterSummaries}
                teamId={team.id}
                teamName={team.name}
                seasonId={activeSeason.id}
                currentSeasonName={currentSeasonName}
              />
            ) : (
              <PublicPlayerDirectory
                players={roster}
                showFilters={false}
              />
            )}
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

async function getLaunchPlayers() {
  if (!hasSupabaseConfig()) return null;

  try {
    const supabase = await createClient();
    return await new SupabaseLaunchRepository(supabase).getPlayers();
  } catch {
    return null;
  }
}

async function getActiveSeasonRosterPlayerIds(seasonId: string, teamId: string): Promise<ReadonlySet<string>> {
  if (!hasSupabaseConfig()) return new Set<string>();

  try {
    const supabase = await createClient();
    const {data, error} = await supabase
      .from('launch_season_roster_memberships')
      .select('player_id')
      .eq('season_id', seasonId)
      .eq('team_id', teamId)
      .eq('status', 'Active');
    if (error) return new Set<string>();
    return new Set((data ?? []).map((membership) => membership.player_id));
  } catch {
    return new Set<string>();
  }
}

function sameCourse(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function findDirections(courseName: string, courseDirections: Map<string, string>): string | undefined {
  const courseSlug = createSlug(courseName);
  const exact = courseDirections.get(courseSlug);
  if (exact) return exact;

  for (const [candidate, directions] of courseDirections) {
    const sharedWords = candidate
      .split('-')
      .filter((word) => word.length > 3 && courseSlug.includes(word));
    if (sharedWords.length >= 2) return directions;
  }

  return undefined;
}

function NextMatchCard({event, courseDirections}: {
  event: TeamScheduleEvent;
  courseDirections: Map<string, string>;
}) {
  const directions = findDirections(event.course, courseDirections);

  return (
    <div className={styles.nextMatch}>
      <div>
        <span>Next match</span>
        <h3>{event.isHome ? 'Home vs' : 'Away at'} {event.opponent}</h3>
        <p>
          {event.date} / {event.time} /{' '}
          {directions ? <a href={directions} target="_blank" rel="noreferrer">{event.course}</a> : event.course}
        </p>
      </div>
      <Link href={event.href}>Match page</Link>
    </div>
  );
}

function TeamSchedule({events, courseDirections}: {
  events: TeamScheduleEvent[];
  courseDirections: Map<string, string>;
}) {
  if (!events.length) {
    return <p className={styles.empty}>No scheduled matchdays have been posted for this team yet.</p>;
  }

  return (
    <div className={styles.matchHistoryWrap}>
      <table>
        <thead><tr><th>Date</th><th>Opponent</th><th>Course</th><th>Status</th><th>Page</th></tr></thead>
        <tbody>{events.map((event) => {
          const directions = findDirections(event.course, courseDirections);
          return (
            <tr key={event.id}>
              <td><strong>{event.date}</strong><small>{event.time}</small></td>
              <td>{event.isHome ? 'vs' : 'at'} {event.opponent}</td>
              <td>{directions ? <a href={directions} target="_blank" rel="noreferrer">{event.course}</a> : event.course}</td>
              <td>{event.status}</td>
              <td><Link href={event.href}>Open</Link></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
