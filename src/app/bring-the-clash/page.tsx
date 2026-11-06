import type {Metadata} from 'next';
import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import styles from './BringTheClash.module.css';

const FACEBOOK_GROUP_URL = 'https://facebook.com/groups/780013754161635/';

export const metadata: Metadata = {
  title: 'Bring the Clash to Your Community | CCTeamClash',
  description: 'Bring team-based disc golf to your area. Discover Coastal Carolina Team Clash, follow the current season, and prepare for 2027–28 expansion consideration.',
  alternates: {canonical: '/bring-the-clash'},
  openGraph: {
    title: 'Fun. Fellowship. Disc Golf. | Bring the Clash to Your Area',
    description: 'More than competition: teams, friends, matchdays, and shared meals. Bring CCTeamClash to your community next season.',
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
              There&apos;s nothing like representing your home course with your friends.
              The competition brings us together. The laughs, food, friendships, and stories are what make the Clash special.
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

        <section className={`shell ${styles.introSection}`}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>More than a tournament</span>
            <h2>GREAT MATCHES. <em>EVEN BETTER COMPANY.</em></h2>
            <p>The Clash gives you something to compete for—and a reason to spend the day with your people. This is disc golf built around fun, fellowship, and community.</p>
          </div>
          <div className={styles.benefitGrid}>
            <article className={styles.benefitCard}>
              <span className={styles.cardNumber}>01 / FRIENDSHIP</span>
              <h3>Play with your people.</h3>
              <p>Represent your home course, wear your team colors, and make memories with the friends and neighbors who make disc golf worth playing.</p>
            </article>
            <article className={styles.benefitCard}>
              <span className={styles.cardNumber}>02 / FELLOWSHIP</span>
              <h3>Stay for the good stuff.</h3>
              <p>Share a meal, tell stories from the round, and enjoy time together. Win or lose, the friendships are bigger than the scoreboard.</p>
            </article>
            <article className={styles.benefitCard}>
              <span className={styles.cardNumber}>03 / COMPETITION</span>
              <h3>Have fun competing.</h3>
              <p>Singles and doubles match play give everyone a chance to contribute. Rivalries are real, but fun and sportsmanship come first.</p>
            </article>
          </div>
          <div className={styles.fellowshipCallout}>
            <div>
              <span className={styles.calloutLabel}>The real spirit of the Clash</span>
              <h3>THROW DISCS. SHARE A MEAL. <em>MAKE FRIENDS.</em></h3>
            </div>
            <p>It&apos;s the conversations before the first tee, the cheers during a close match, and the food and fellowship afterward. That&apos;s the community we want to grow.</p>
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
              <span className={styles.eyebrow}>The fun of matchday</span>
              <h2>ONE TEAM.<br /><em>ONE BIG DAY.</em></h2>
              <p>Show up with your teammates, compete in singles and doubles, cheer each other on, and stick around to enjoy good company and a shared meal.</p>
              <p>There&apos;s plenty to follow all season—matchups, standings, stats, stories, and new rivalries—but the heart of the Clash is the time spent together.</p>
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
            <p>Come for the competition. Stay for the friends, the food, and the fun. Bring your community together for next season.</p>
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
