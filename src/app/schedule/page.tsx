import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createPublicScheduleService} from '@/core/createPublicScheduleService';
import {createPublicStandingsService} from '@/core/createPublicStandingsService';
import type {TeamStanding} from '@/services/standings/StandingsTypes';
import styles from './schedule.module.css';

export const revalidate = 60;

function formatRecord(standing: TeamStanding | undefined): string {
  if (!standing) return '0–0';
  const ties = Math.max(0, standing.gamesPlayed - standing.wins - standing.losses);
  return ties > 0
    ? `${standing.wins}–${standing.losses}–${ties}`
    : `${standing.wins}–${standing.losses}`;
}

export default async function SchedulePage() {
  const [publicMatches, standings] = await Promise.all([
    createPublicScheduleService().getPublishedEvents(),
    createPublicStandingsService().getActiveSeasonStandings(),
  ]);
  const standingsByTeam = new Map(
    (standings?.entries ?? []).map((entry) => [entry.team.id, entry]),
  );
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
          <h1>Schedule</h1>
          <p>Away team is listed first. Tap any matchup to open Matchday.</p>
        </header>

        {rounds.length ? (
          <>
            <div className={styles.seasonBanner}>
              <strong>2026–27 Regular Season</strong>
              <span>{publicMatches.length} matchups · {rounds.length} rounds</span>
            </div>

            <div className={styles.rounds}>
              {rounds.map((round) => (
                <section className={styles.roundCard} key={round.roundId}>
                  <header className={styles.roundRail}>
                    <span className={styles.roundKicker}>Round {round.roundNumber}</span>
                    <h2>{round.month}</h2>
                    <small>{round.matches.length} matchups</small>
                  </header>

                  <div className={styles.matches}>
                    {round.matches.map((match) => {
                      const awayStanding = standingsByTeam.get(match.awayTeamId);
                      const homeStanding = standingsByTeam.get(match.homeTeamId);
                      return (
                        <article className={styles.match} key={match.id}>
                          <a className={styles.matchLink} href={match.href}>
                            <div className={styles.matchMeta}>
                              <span>{match.date}</span>
                              <span>{match.time}</span>
                            </div>

                            <div className={styles.teams}>
                              <span className={styles.team}>
                                {awayStanding?.team.logo ? (
                                  <img
                                    className={styles.teamLogo}
                                    src={awayStanding.team.logo}
                                    alt={`${match.away} logo`}
                                    loading="lazy"
                                  />
                                ) : null}
                                <span className={styles.teamCopy}>
                                  <strong>{match.away}</strong>
                                  <small>{formatRecord(awayStanding)}</small>
                                </span>
                              </span>

                              <span className={styles.at} aria-hidden="true">@</span>

                              <span className={`${styles.team} ${styles.homeTeam}`}>
                                <span className={`${styles.teamCopy} ${styles.homeCopy}`}>
                                  <strong>{match.home}</strong>
                                  <small>{formatRecord(homeStanding)}</small>
                                </span>
                                {homeStanding?.team.logo ? (
                                  <img
                                    className={styles.teamLogo}
                                    src={homeStanding.team.logo}
                                    alt={`${match.home} logo`}
                                    loading="lazy"
                                  />
                                ) : null}
                              </span>
                            </div>
                          </a>

                          <div className={styles.matchFooter}>
                            {match.directionsUrl ? (
                              <a
                                className={styles.courseLink}
                                href={match.directionsUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {match.course}
                              </a>
                            ) : (
                              <span className={styles.courseLink}>{match.course}</span>
                            )}
                            <a className={styles.matchdayLink} href={match.href}>Matchday →</a>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.empty}>No published matches are currently available.</div>
        )}
      </main>
      <Footer />
    </>
  );
}
