import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {services} from '@/core/ServiceContainer';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {createServerResultsService} from '@/core/createServerResultsService';
import {getStoredCourses} from '@/services/courses/CourseStore';
import {getStoredTeams} from '@/services/teams/TeamStore';
import {resolveMatchday} from '@/services/matches/MatchdayService';
import styles from './Matchday.module.css';

export const dynamic = 'force-dynamic';

type MatchdayPageProps = {
  params: Promise<{id: string}>;
};

export default async function MatchdayPage({params}: MatchdayPageProps) {
  const {id} = await params;
  const scheduleService = await createServerScheduleService();
  const resultsService = await createServerResultsService();
  const [match, publishedResult] = await Promise.all([
    scheduleService.getPublishedEventById(id),
    resultsService.getPublishedResult(id),
  ]);
  if (!match) notFound();

  const [teams, players, courses] = await Promise.all([
    getStoredTeams({status: 'active'}),
    services.players.getAll({status: 'active'}),
    getStoredCourses({status: 'active'}),
  ]);
  const matchday = resolveMatchday(match, teams, players, courses);
  const coursePhoto = getCoursePhotoUrl(matchday.courseDetails?.photoUrl ?? '');

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div
            className={styles.heroPhoto}
            style={coursePhoto ? {backgroundImage: `linear-gradient(90deg, rgba(5, 9, 10, .22), rgba(5, 9, 10, .78)), url(${coursePhoto})`} : undefined}
            aria-label={`${matchday.courseDetails?.name ?? matchday.course} event backdrop`}
          />
          <div className={styles.heroContent}>
            <h1>{matchday.homeTeam.name} vs {matchday.awayTeam.name}</h1>
            <div className={styles.metaLine}>
              <span>{matchday.date}</span>
              <span>{matchday.time}</span>
              {matchday.courseDetails?.mapUrl ? (
                <a href={matchday.courseDetails.mapUrl} target="_blank" rel="noreferrer">{matchday.courseDetails.name}</a>
              ) : <span>{matchday.courseDetails?.name ?? matchday.course}</span>}
            </div>
          </div>
        </section>

        <section className={`shell ${styles.matchupBand}`}>
          <div className={styles.matchupCard}>
            <TeamHeader team={matchday.homeTeam} label="Home team" />
            <div className={styles.versus}>VS</div>
            <TeamHeader team={matchday.awayTeam} label="Away team" reverse />
          </div>
        </section>

        <section className={`shell ${styles.content}`}>
          <div className={styles.sectionCard}>
            <header className={styles.sectionHeader}>
              <div>
                <span>Match roster</span>
                <h2>Who is playing</h2>
              </div>
              <Link className="gold-link" href="/account">Captain sign in -&gt;</Link>
            </header>
            <div className={styles.rosterGrid}>
              <RosterList name={matchday.homeTeam.name} players={matchday.homeTeam.roster} />
              <RosterList name={matchday.awayTeam.name} players={matchday.awayTeam.roster} />
            </div>
          </div>

          <aside className={styles.sideStack}>
            <section className={styles.sideCard}>
              <span>Scoreboard</span>
              <h2>
                {publishedResult
                  ? `${publishedResult.homeScore} – ${publishedResult.awayScore}`
                  : 'Pending'}
              </h2>
              <p>
                {publishedResult
                  ? `${matchday.homeTeam.name} vs ${matchday.awayTeam.name} · Final`
                  : 'Official results will appear here after commissioner review.'}
              </p>
            </section>
          </aside>

          <section className={styles.sectionCard}>
            <header className={styles.sectionHeader}>
              <div>
                <span>Photos and comments</span>
                <h2>Match feed</h2>
              </div>
              <Link className="gold-link" href="/account">Sign in to post -&gt;</Link>
            </header>
            <div className={styles.photoGrid}>
              <div className={styles.photoTile}>Photos open matchday</div>
              <div className={styles.photoTile}>Player comments</div>
              <div className={styles.photoTile}>Final recap</div>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </>
  );
}

function TeamHeader({team, label, reverse = false}: {
  team: ReturnType<typeof resolveMatchday>['homeTeam'];
  label: string;
  reverse?: boolean;
}) {
  const logo = <TeamLogo name={team.name} logo={team.logo} />;
  const copy = (
    <div>
      <h2>{team.name}</h2>
      <p>{label} / {team.captain}</p>
    </div>
  );

  return (
    <Link className={styles.teamBlock} href={`/teams/${team.slug}`}>
      {reverse ? copy : logo}
      {reverse ? logo : copy}
    </Link>
  );
}

function TeamLogo({name, logo}: {name: string; logo: string}) {
  return (
    <span className={styles.logo}>
      {logo ? <Image src={logo} alt={`${name} logo`} width={104} height={104} /> : initials(name)}
    </span>
  );
}

function RosterList({name, players}: {name: string; players: Array<{id: string; name: string; pdgaRating: number | null; pdgaNumber: string}>}) {
  return (
    <div className={styles.rosterTeam}>
      <div className={styles.rosterTitle}><span>{name}</span><span>{players.length}</span></div>
      {players.length ? players.slice(0, 12).map((player, index) => (
        <div className={styles.playerRow} key={player.id}>
          <b>{initials(player.name)}</b>
          <div>
            <strong>{index + 1}. {player.name}</strong>
            <small>{player.pdgaRating ? `Rating ${player.pdgaRating}` : 'Rating pending'}{player.pdgaNumber ? ` / PDGA #${player.pdgaNumber}` : ''}</small>
          </div>
          <span className={styles.status}>Pending</span>
        </div>
      )) : <p className={styles.empty}>Roster has not been selected yet.</p>}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getCoursePhotoUrl(url: string): string {
  const cleanedUrl = url.trim();
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(cleanedUrl) ? cleanedUrl : '';
}
