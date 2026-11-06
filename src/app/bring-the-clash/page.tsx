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
    title: 'Your Area. Your Team. Your Clash.',
    description: 'Interested in bringing CCTeamClash to your disc golf community? Get to know the league and join the Facebook group for next season.',
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
            <span className={styles.eyebrow}>Coastal Carolina Team Clash · Future expansion</span>
            <h1 id="expansion-title">YOUR AREA.<br />YOUR TEAM.<br /><em>YOUR CLASH.</em></h1>
            <p className={styles.heroLead}>
              It&apos;s time for your disc golf community to play for something bigger.
              Bring together your home course, your people, and your local pride in a season of team competition.
            </p>
            <div className={styles.heroActions}>
              <FacebookButton />
              <Link className={styles.secondaryButton} href="/schedule">See the Clash in action <span aria-hidden="true">→</span></Link>
            </div>
            <p className={styles.heroNote}>New areas cannot join the current season. Connect now to prepare for next year.</p>
          </div>
        </section>

        <section className={`shell ${styles.statRibbon}`} aria-label="How the Clash works">
          <div><strong>8</strong><span>Current teams</span></div>
          <div><strong>18</strong><span>Matchday roster positions</span></div>
          <div><strong>2</strong><span>Singles + doubles rounds</span></div>
          <div><strong>1</strong><span>Team to rally behind</span></div>
        </section>

        <section className={`shell ${styles.introSection}`}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>This is not another tournament</span>
            <h2>DISC GOLF WITH <em>SOMETHING ON THE LINE.</em></h2>
            <p>Traditional events are about your individual round. The Clash is about what your whole team can accomplish together.</p>
          </div>
          <div className={styles.benefitGrid}>
            <article className={styles.benefitCard}>
              <span className={styles.cardNumber}>01 / REPRESENT</span>
              <h3>Your community. Your colors.</h3>
              <p>Build a team around the people and courses you already love. Take on other clubs and communities with hometown pride.</p>
            </article>
            <article className={styles.benefitCard}>
              <span className={styles.cardNumber}>02 / COMPETE</span>
              <h3>Every matchup matters.</h3>
              <p>Singles match play and doubles competition put strategy, depth, and teamwork at the center of matchday.</p>
            </article>
            <article className={styles.benefitCard}>
              <span className={styles.cardNumber}>03 / BELONG</span>
              <h3>A season, not a Saturday.</h3>
              <p>Follow standings, rivalries, match recaps, player stats, and the chase for a championship all season long.</p>
            </article>
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
              <span className={styles.eyebrow}>Built around matchday</span>
              <h2>ONE TEAM.<br /><em>EVERY POINT.</em></h2>
              <p>Captains match up players. Singles battles give way to doubles strategy. Each round adds to the team total. You win or lose together.</p>
              <p>The league follows the action with schedules, results, player statistics, stories, and a dedicated matchday experience.</p>
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
            <p>The 2026–27 season is already underway. We&apos;re connecting with interested communities now for possible participation beginning in 2027–28.</p>
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
            <h2>THE NEXT GREAT RIVALRY<br /><em>COULD START IN YOUR TOWN.</em></h2>
            <p>Follow this season. Bring your friends. Start organizing. We&apos;ll see what next year brings.</p>
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
