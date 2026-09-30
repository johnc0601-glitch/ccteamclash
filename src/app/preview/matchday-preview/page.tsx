import {Footer, SiteHeader} from '@/components/SiteHeader';
import styles from './page.module.css';

const stats = [
  {label: 'Series', value: 'KB leads 2–0'},
  {label: 'Proven', value: 'Duncan 15 · England 14'},
  {label: 'Swing player', value: 'Eli Batazhan · 2–0 vs KB'},
  {label: 'Story', value: 'New Burnt Mill layout'},
];

export default function MatchdayPreviewConceptPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroTeams}>
            <div className={styles.team}>
              <img src="/team-logos/kb.png" alt="KB logo" />
              <strong>KB</strong>
              <span>Away</span>
            </div>

            <div className={styles.vs}>VS</div>

            <div className={`${styles.team} ${styles.home}`}>
              <img
                src="https://iwyssbrekhwkjnlagxzc.supabase.co/storage/v1/object/public/team-logos/teams/dark-knights/logo.jpg"
                alt="Dark Knights logo"
              />
              <strong>Dark Knights</strong>
              <span>Home</span>
            </div>
          </div>

          <div className={styles.meta}>
            <span>Oct 3</span>
            <span>9:00 AM</span>
            <span>Burnt Mill Creek</span>
            <span className={styles.weather}>☀ 72° · Wind SW 7 mph</span>
          </div>
        </section>

        <section className={`shell ${styles.previewWrap}`}>
          <article className={styles.previewCard}>
            <header className={styles.previewHeader}>
              <div>
                <span className={styles.kicker}>Before the clash</span>
                <h1>Match Preview</h1>
              </div>
              <span className={styles.round}>Round 1</span>
            </header>

            <div className={styles.stats}>
              {stats.map((stat) => (
                <div className={styles.stat} key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>

            <p className={styles.battle}>
              KB heads into Burnt Mill, where the Dark Knights are waiting on unfamiliar ground.
            </p>

            <details className={styles.fullPreview}>
              <summary>
                <span>Full matchup preview</span>
                <span aria-hidden="true">⌄</span>
              </summary>

              <div className={styles.story}>
                <p>Dark Knights probably don&apos;t need much reminding about their recent history with KB.</p>
                <p>
                  KB has won both previous meetings, including a 21–12 win last season and a 24–13
                  victory the year before. This time, though, the setting changes everything.
                </p>
                <p>
                  Burnt Mill Creek gives the matchup a fresh feel. The Clash Gold and Clash Blue
                  layouts have only been set up once, so neither team has years of experience on
                  these exact lines. Both sides will be learning on the fly.
                </p>
                <p>
                  Eric England leads Dark Knights with 14 career Clash wins. Mike Duncan has 15 for
                  KB, while Scott Strickland has 14. KB also has two players who have given Dark
                  Knights fits: Duncan and Dan Moles are both 4–0 against them.
                </p>
                <p>
                  Dark Knights have an answer of their own. Eli Batazhan is 2–0 against KB, and DK
                  brings one of the league&apos;s deeper groups of proven match-play players.
                </p>

                <div className={styles.watch}>
                  <span>What to watch</span>
                  <strong>
                    KB owns the history, but none of those wins came at Burnt Mill. This one should
                    feel new from the first point.
                  </strong>
                </div>
              </div>
            </details>
          </article>

          <section className={styles.afterPreview} aria-label="Placement example">
            <div>
              <span>Next on Matchday</span>
              <strong>Prediction & Match Details</strong>
            </div>
            <p>
              The preview stays near the top. Scoreboard, attendance, captain tools, feed and rosters
              continue below.
            </p>
          </section>
        </section>
      </main>
      <Footer />
    </>
  );
}
