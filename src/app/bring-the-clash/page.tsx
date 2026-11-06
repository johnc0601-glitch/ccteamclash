import type {Metadata} from 'next';
import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import styles from './BringTheClash.module.css';

const FACEBOOK_GROUP_URL = 'https://facebook.com/groups/780013754161635/';

export const metadata: Metadata = {
  title: 'Bring the Clash to Your Community | CCTeamClash',
  description: 'Discover the CCTeamClash matchday format: competitive singles, a home-team potluck meal, and doubles with friends. Follow this season and prepare for 2027–28.',
  alternates: {canonical: '/bring-the-clash'},
  openGraph: {
    title: 'Fun. Fellowship. Disc Golf. | Bring the Clash to Your Area',
    description: 'Competitive singles. An amazing potluck provided by the home team. Doubles with friends. Bring the Clash to your community.',
    url: '/bring-the-clash',
    type: 'website',
    images: [{url: '/matchday/round-2-fall.png', width: 1672, height: 941, alt: 'Coastal Carolina Team Clash disc golf matchday artwork'}],
  },
};

function FacebookButton({label = 'Join the Facebook group'}: {label?: string}) {
  return (
    <a className={styles.goldButton} href={FACEBOOK_GROUP_URL} target="_blank" rel="noopener noreferrer">
      {label}<span aria-hidden="true"> ↗</span>
    </a>
  );
}

export default function BringTheClashPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="expansion-title">
          <div className={styles.heroBackdrop} aria-hidden="true" />
          <div className={`shell ${styles.heroInner}`}>
            <div className={styles.seasonLabel}><span className={styles.goldDot} /> Looking ahead to the 2027–28 season</div>
            <span className={styles.heroTagline}>FUN. FELLOWSHIP. DISC GOLF.</span>
            <span className={styles.eyebrow}>Coastal Carolina Team Clash · Future expansion</span>
            <h1 id="expansion-title">YOUR AREA.<br />YOUR TEAM.<br /><em>YOUR CLASH.</em></h1>
            <p className={styles.heroLead}>
              Start with the thrill of competitive singles. Gather for an amazing potluck meal provided by the home team.
              Then team up with friends for doubles. That&apos;s a Clash matchday: great competition, even better fellowship.
            </p>
            <p className={styles.heroSequence} aria-label="Matchday sequence: Singles, home-team potluck, doubles">
              <span>COMPETE IN SINGLES</span><b aria-hidden="true">→</b><span>SHARE A POTLUCK</span><b aria-hidden="true">→</b><span>PLAY DOUBLES</span>
            </p>
            <div className={styles.heroActions}>
              <FacebookButton />
              <Link className={styles.secondaryButton} href="/schedule">See the Clash in action <span aria-hidden="true">→</span></Link>
            </div>
            <p className={styles.heroNote}>New areas cannot join the current season. Connect now to prepare for next year.</p>
          </div>
        </section>

        <section className={`shell ${styles.statRibbon}`} aria-label="2026–27 Clash season at a glance">
          <div><strong>8</strong><span>Competing teams</span></div>
          <div><strong>214</strong><span>Active players</span></div>
          <div><strong>20</strong><span>Matches on the season schedule</span></div>
          <div><strong className={styles.statWord}>MEALS</strong><span>Served and shared on matchday</span></div>
        </section>
        <p className={`shell ${styles.statFootnote}`}>2026–27 season · Player count verified November 6, 2026 · Five rounds on the published schedule</p>

        <section className={`shell ${styles.introSection}`} aria-labelledby="matchday-format">
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>The Clash matchday format</span>
            <h2 id="matchday-format">COMPETE. BREAK BREAD. <em>PLAY TOGETHER.</em></h2>
            <p>A Clash matchday has its own rhythm: competitive singles, an incredible home-team potluck, then a doubles round filled with camaraderie. Here&apos;s how the day unfolds.</p>
          </div>
          <div className={styles.benefitGrid}>
            <article className={`${styles.benefitCard} ${styles.singlesCard}`}>
              <div className={styles.stageTop}><span className={styles.cardNumber}>01 / FIRST ROUND</span><span className={styles.stageKind}>THE COMPETITION</span></div>
              <span className={styles.stageIcon} aria-hidden="true">◎</span>
              <h3>Competitive singles.</h3>
              <p>Match up head-to-head against a player from the opposing team. This is the more competitive part of the day, where individual battles earn points for your team.</p>
              <strong className={styles.stageBottom}>Bring your best game.</strong>
            </article>
            <article className={`${styles.benefitCard} ${styles.potluckCard}`}>
              <div className={styles.stageTop}><span className={styles.cardNumber}>02 / BETWEEN ROUNDS</span><span className={styles.stageKind}>THE FELLOWSHIP</span></div>
              <span className={styles.stageIcon} aria-hidden="true">✦</span>
              <h3>Amazing potluck meal.</h3>
              <p>The home team provides a potluck meal for everyone. Both teams gather to eat, share stories, laugh, and get to know the people they&apos;re competing against.</p>
              <strong className={styles.stageBottom}>Good food. Better company.</strong>
            </article>
            <article className={`${styles.benefitCard} ${styles.doublesCard}`}>
              <div className={styles.stageTop}><span className={styles.cardNumber}>03 / FINAL ROUND</span><span className={styles.stageKind}>THE FUN</span></div>
              <span className={styles.stageIcon} aria-hidden="true">◎◎</span>
              <h3>Doubles with friends.</h3>
              <p>Finish by teaming up with a friend for doubles. The points still count, but sharing shots, cheering each other on, and playing together bring a whole different energy.</p>
              <strong className={styles.stageBottom}>Win together. Have fun together.</strong>
            </article>
          </div>
          <div className={styles.fellowshipCallout}>
            <div>
              <span className={styles.calloutLabel}>Fun. Fellowship. Disc Golf.</span>
              <h3>MORE THAN A MATCH. <em>IT&apos;S A DAY TOGETHER.</em></h3>
            </div>
            <p>Come ready to compete. Stay to share a table with the other team. Finish the day playing alongside your friends. It&apos;s the mix of rivalry and friendship that makes the Clash special.</p>
          </div>
        </section>

        <section className={styles.matchdayBand}>
          <div className={`shell ${styles.matchdayGrid}`}>
            <div className={styles.matchdayVisual}>
              <div className={styles.scoreTop}>THE CLASH EXPERIENCE <span>HEAD TO HEAD</span></div>
              <div className={styles.teamRow}>
                <div><img src="/team-logos/riptide.jpg" alt="Riptide team logo" width="95" height="95" /><strong>RIPTIDE</strong></div>
                <span className={styles.vs}>VS</span>
                <div><img src="/team-logos/ninjas.jpg" alt="Ninjas team logo" width="95" height="95" /><strong>NINJAS</strong></div>
              </div>
              <div className={styles.scoreFoot}>YOUR TEAM COULD BE NEXT</div>
            </div>
            <div className={styles.matchdayContent}>
              <span className={styles.eyebrow}>A competitive league with a community spirit</span>
              <h2>PLAY HARD.<br /><em>HAVE FUN.</em></h2>
              <p>The singles round brings the intensity. The home team&apos;s potluck gives everyone a chance to connect. Doubles closes the day playing alongside friends.</p>
              <p>Throughout the season, teams follow matchups, results, standings, and stories—but the real reward is the community built between rounds and across the table.</p>
              <div className={styles.textLinks}>
                <Link href="/teams">Meet the current teams <span aria-hidden="true">→</span></Link>
                <Link href="/standings">Explore the standings <span aria-hidden="true">→</span></Link>
              </div>
            </div>
          </div>
        </section>

        <section className={`shell ${styles.stepsSection}`}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>Next season starts with you</span>
            <h2>BRING THE CLASH <em>TO YOUR AREA.</em></h2>
            <p>The 2026–27 season is already underway. Bring your friends together now, follow the fun, and get ready to build your own Clash community for possible participation in 2027–28.</p>
          </div>
          <div className={styles.steps}>
            <div><span>01</span><h3>Join the conversation</h3><p>Join our Facebook group to meet the community, follow results, and see what the league is all about.</p></div>
            <div><span>02</span><h3>Build local interest</h3><p>Talk with potential captains, players, and course hosts in your area. A strong local group starts well before opening day.</p></div>
            <div><span>03</span><h3>Watch this season</h3><p>Follow current matchdays and learn the competition format, rules, and expectations for hosting.</p></div>
            <div><span>04</span><h3>Prepare for next year</h3><p>When team registration opens for the next season, interested groups can seek consideration through the official process.</p></div>
          </div>
        </section>

        <section className={`shell ${styles.faqSection}`}>
          <div className={styles.faqHeading}>
            <span className={styles.eyebrow}>Good to know</span>
            <h2>QUESTIONS BEFORE YOU START?</h2>
          </div>
          <div className={styles.faqItems}>
            <details><summary>Can a new area join this season?</summary><p>No. The current 2026–27 season is underway. The earliest opportunity for a new team or community to be considered is next season, 2027–28.</p></details>
            <details><summary>Does joining the Facebook group register a team?</summary><p>No. The Facebook group is a place to connect and prepare. Official registration and any team approvals happen through the league&apos;s published process.</p></details>
            <details><summary>What should a potential team prepare?</summary><p>Start with an interested captain, a group of committed players, and a course where your team may be able to host matches. Final requirements and participation decisions rest with the commissioners.</p></details>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className="shell">
            <span className={styles.eyebrow}>Fun. Fellowship. Disc Golf.</span>
            <h2>THE BEST PART OF THE CLASH?<br /><em>THE PEOPLE YOU SHARE IT WITH.</em></h2>
            <p>Competitive singles, a home-team potluck, and doubles with friends. Bring your community together for the next season of fun, fellowship, and disc golf.</p>
            <div className={styles.heroActions}>
              <FacebookButton label="Join the Clash community" />
              <Link className={styles.secondaryButton} href="/rules">Read the league rules <span aria-hidden="true">→</span></Link>
            </div>
            <small>Interest is welcome now. Participation in a future season is subject to registration, approval, and league capacity.</small>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
