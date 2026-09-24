import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
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

export default function LeagueHubPage() {
  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">Around the league</span>
        <h1>League</h1>
        <p className="intro">Standings, players, teams, schedule, and the wider Team Clash season.</p>

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
