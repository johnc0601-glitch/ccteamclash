import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createPublicScheduleService} from '@/core/createPublicScheduleService';
import styles from './schedule.module.css';

export const revalidate = 60;

export default async function SchedulePage() {
  const publicMatches = await createPublicScheduleService().getPublishedEvents();
  const groupedRounds = new Map<string, (typeof publicMatches)[number][]>();

  for (const match of publicMatches) {
    const round = groupedRounds.get(match.roundId) ?? [];
    round.push(match);
    groupedRounds.set(match.roundId, round);
  }

  const rounds = Array.from(groupedRounds.entries()).map(([roundId, matches], index) => ({
    roundId,
    roundNumber: index + 1,
    month: new Intl.DateTimeFormat('en-US', {month: 'long'}).format(matches[0].dateTime),
    matches,
  }));

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell schedule-page ${styles.page}`}>
        <header className={styles.pageHeader}>
          <div>
            <span className="eyebrow">2026–27 season</span>
            <h1>Schedule</h1>
          </div>
          <p>Away team is listed first. Tap any matchup to open Matchday.</p>
        </header>

        {rounds.length ? (
          <div className={styles.rounds}>
            {rounds.map((round) => (
              <section className={styles.roundCard} key={round.roundId}>
                <header className={styles.roundHeader}>
                  <div>
                    <span className={styles.roundKicker}>Round {round.roundNumber}</span>
                    <h2>{round.month}</h2>
                  </div>
                </header>

                <div className={styles.matches}>
                  {round.matches.map((match) => (
                    <article className={styles.match} key={match.id}>
                      <a className={styles.teams} href={match.href}>
                        <span className={styles.team}>
                          <small>Away</small>
                          <strong>{match.away}</strong>
                        </span>
                        <span className={styles.at} aria-hidden="true">@</span>
                        <span className={`${styles.team} ${styles.homeTeam}`}>
                          <small>Home</small>
                          <strong>{match.home}</strong>
                        </span>
                      </a>

                      <div className={styles.meta}>
                        <span>{match.date}</span>
                        <span>{match.time}</span>
                        {match.directionsUrl ? (
                          <a href={match.directionsUrl} target="_blank" rel="noreferrer">{match.course}</a>
                        ) : (
                          <span>{match.course}</span>
                        )}
                        <a className={styles.matchdayLink} href={match.href}>Matchday →</a>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No published matches are currently available.</div>
        )}
      </main>
      <Footer />
    </>
  );
}
