import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createPublicStandingsService} from '@/core/createPublicStandingsService';
import {getHomepageData} from '@/services/home/HomepageDataService';
import styles from './LeagueHub.module.css';

const PRIMARY = [
  {href: '/standings', label: 'Standings', detail: 'Current league table and team records'},
  {href: '/stats', label: 'Players', detail: 'Clash Index, player stats, and movement'},
  {href: '/teams', label: 'Teams', detail: 'Rosters, schedules, records, and team history'},
  {href: '/schedule', label: 'Schedule', detail: 'Every current-season matchup'},
];

const MORE = [
  {href: '/stories', label: 'Stories'},
  {href: '/courses', label: 'Courses'},
  {href: '/history', label: 'History'},
  {href: '/playoffs', label: 'Playoffs'},
];

export default async function LeagueHubPage() {
  const [homepage, standingsData] = await Promise.all([
    getHomepageData(),
    createPublicStandingsService().getActiveSeasonStandings(),
  ]);
  const nextRound = homepage.homeEvents;
  const standings = standingsData?.entries ?? [];
  const hasResults = standings.some((entry) => entry.gamesPlayed > 0);
  const nextRoundDate = nextRound[0]?.date ?? null;

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">Around the league</span>
        <h1>League</h1>
        <p className="intro">The current round, standings, players, teams, and the wider Team Clash season.</p>

        <section className={styles.snapshot} aria-label="League snapshot">
          <article className={styles.roundCard}>
            <header>
              <div>
                <span>{nextRound[0]?.bucket === 'upcoming' ? 'Next round' : 'Latest round'}</span>
                <strong>{nextRoundDate ?? 'Schedule coming soon'}</strong>
              </div>
              <Link href="/schedule">Full schedule</Link>
            </header>

            {nextRound.length ? (
              <div className={styles.roundMatches}>
                {nextRound.map((match) => (
                  <Link href={match.href} key={match.id} className={styles.roundMatch}>
                    <div>
                      <strong>{match.away}</strong>
                      <span>at</span>
                      <strong>{match.home}</strong>
                    </div>
                    <small>{match.time} · {match.course}</small>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>No published league matches are available yet.</p>
            )}
          </article>

          <article className={styles.standingsCard}>
            <header>
              <div>
                <span>Standings</span>
                <strong>{standingsData?.season.name ?? 'Current season'}</strong>
              </div>
              <Link href="/standings">View all</Link>
            </header>

            {hasResults ? (
              <ol className={styles.standingList}>
                {standings.slice(0, 5).map((entry) => (
                  <li key={entry.team.id}>
                    <b>{entry.rank}</b>
                    <span>{entry.team.shortName || entry.team.name}</span>
                    <strong>{entry.wins}-{entry.losses}</strong>
                    <small>{entry.pointDifferential > 0 ? '+' : ''}{entry.pointDifferential}</small>
                  </li>
                ))}
              </ol>
            ) : (
              <div className={styles.preseason}>
                <strong>Preseason</strong>
                <span>Standings populate after official Matchday results are published.</span>
                {nextRoundDate ? <small>First published round · {nextRoundDate}</small> : null}
              </div>
            )}
          </article>
        </section>

        <section className={styles.primary} aria-label="League sections">
          {PRIMARY.map((item) => (
            <Link href={item.href} className={styles.card} key={item.href}>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </section>

        <section className={styles.more}>
          <h2>More from Team Clash</h2>
          <div>
            {MORE.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
