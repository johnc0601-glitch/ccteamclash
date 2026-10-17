import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import styles from './Rules.module.css';

export const metadata: Metadata = {
  title: 'League Rules | CC Team Clash',
  description: 'A working draft of Team Clash match format, roster deadlines, scoring, standings and league policies.',
};

const QUICK_LINKS = [
  {id: 'format', label: 'Match format'},
  {id: 'rosters', label: 'Rosters'},
  {id: 'scoring', label: 'Scoring'},
  {id: 'standings', label: 'Standings'},
  {id: 'ratings', label: 'Clash Index'},
  {id: 'review', label: 'To finalize'},
] as const;

export default function RulesPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={['shell', styles.heroInner].join(' ')}>
            <div className={styles.heroCopy}>
              <div className={styles.kicker}>COASTAL CAROLINA TEAM CLASH / 2026–27</div>
              <h1>THE LEAGUE <span>RULEBOOK.</span></h1>
              <p>Everything players and captains need to know before the next Clash. Clear rules, fewer surprises on matchday.</p>
              <div className={styles.draftLine}>
                <span className={styles.draftMarker}>WORKING DRAFT</span>
                <span>Review in progress. Not yet the published league rulebook.</span>
              </div>
            </div>
            <div className={styles.heroAside} aria-label="League philosophy">
              <span>THE STANDARD</span>
              <strong>COMPETE<br />FAIR.</strong>
              <p>Respect your opponent. Protect the integrity of every point.</p>
            </div>
          </div>
        </header>

        <div className={['shell', styles.content].join(' ')}>
          <section className={styles.essentials} aria-label="Rules at a glance">
            <div><span>STANDARD TEAM</span><strong>18</strong><small>players</small></div>
            <div><span>STANDARD CLASH</span><strong>36</strong><small>points</small></div>
            <div><span>PLAYER RESPONSE</span><strong>FRI · 12 PM</strong><small>Eastern</small></div>
            <div><span>ROSTER LOCK</span><strong>FRI · 3 PM</strong><small>Eastern</small></div>
          </section>

          <div className={styles.layout}>
            <aside className={styles.sideNav} aria-label="Jump to rules">
              <span className={styles.sideLabel}>RULES INDEX</span>
              {QUICK_LINKS.map((item, index) => (
                <a href={'#' + item.id} key={item.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>{item.label}
                </a>
              ))}
              <div className={styles.sideNote}>League policies marked for confirmation are not final.</div>
            </aside>

            <div className={styles.ruleContent}>
              <div className={styles.mobileJump} aria-label="Jump to rules">
                {QUICK_LINKS.map((item) => (
                  <a key={item.id} href={'#' + item.id}>{item.label}</a>
                ))}
              </div>

              <section className={styles.section} id="format">
                <SectionHeading number="01" eyebrow="ON THE COURSE" title="Match format" />
                <p className={styles.sectionLead}>A Clash is a team event made up of singles and doubles contests.</p>
                <div className={styles.ruleGrid}>
                  <RuleItem title="Standard lineup">A full team fields 18 player positions. Players can participate in singles and doubles, with at most one slot per format.</RuleItem>
                  <RuleItem title="Standard points">The normal match structure contains 36 team points before any separately reviewed adjustments.</RuleItem>
                  <RuleItem title="Course and schedule">The official matchup page identifies the teams, date, time, and course. Captains should use that page for the current details.</RuleItem>
                </div>
                <Link className={styles.textLink} href="/schedule">See the league schedule <span aria-hidden="true">→</span></Link>
              </section>

              <section className={styles.section} id="rosters">
                <SectionHeading number="02" eyebrow="BEFORE MATCHDAY" title="Rosters & availability" />
                <p className={styles.sectionLead}>Player confirmations and captain roster decisions have separate deadlines.</p>
                <div className={styles.timeline}>
                  <div><span className={styles.timelineDot}/><div><strong>Friday · 12:00 PM Eastern</strong><p>Player Yes/No attendance responses close.</p></div></div>
                  <div><span className={styles.timelineDot}/><div><strong>Friday · 3:00 PM Eastern</strong><p>Captains&apos; match rosters lock. A commissioner can authorize a reopen or correction.</p></div></div>
                </div>
                <div className={styles.ruleGrid}>
                  <RuleItem title="Captains choose the lineup">Captains select eligible players from the league player pool for each match. Team membership alone does not place a player in a matchup.</RuleItem>
                  <RuleItem title="Rosters are match-specific">The official match roster determines who represents each team on that date. Past results retain the team a player represented at the time.</RuleItem>
                </div>
              </section>

              <section className={styles.section} id="scoring">
                <SectionHeading number="03" eyebrow="COUNT EVERY POINT" title="Scoring & results" />
                <p className={styles.sectionLead}>Contest outcomes contribute to the team total, with special adjustments reviewed separately.</p>
                <div className={styles.pointStrip} aria-label="Standard contest result points">
                  <div><span>WIN</span><strong>1</strong><small>point</small></div>
                  <div><span>TIE</span><strong>½</strong><small>point</small></div>
                  <div><span>LOSS</span><strong>0</strong><small>points</small></div>
                </div>
                <div className={styles.ruleGrid}>
                  <RuleItem title="Unfilled positions">Missing standard singles or doubles player-slots can result in automatic points for the opposing team. The final audit uses the actual unfilled slots.</RuleItem>
                  <RuleItem title="Official results">Team adjustments such as no-shows or women&apos;s bonus points are itemized and commissioner-reviewed instead of being treated as played contests.</RuleItem>
                  <RuleItem title="Publication">Official Matchday results appear after commissioner review. They are separate from any outside live-scoring feed.</RuleItem>
                </div>
              </section>

              <section className={styles.section} id="standings">
                <SectionHeading number="04" eyebrow="THE RACE FOR THE PLAYOFFS" title="Standings & tiebreakers" />
                <p className={styles.sectionLead}>Published regular-season results determine the standings; playoff, draft and reopened results are excluded.</p>
                <ol className={styles.rankList}>
                  <li><strong>Match wins</strong><span>The most important ranking measure.</span></li>
                  <li><strong>Head-to-head</strong><span>Results among the tied teams.</span></li>
                  <li><strong>Points percentage</strong><span>Points earned divided by points available.</span></li>
                  <li><strong>Points earned</strong><span>Total Clash points scored.</span></li>
                  <li><strong>Point differential</strong><span>Points scored minus points conceded.</span></li>
                </ol>
                <p className={styles.smallNote}>A tied team match counts as played but does not add a win or loss. Unresolved circular head-to-head ties fall back to points percentage. Team name and ID are last-resort display sorters.</p>
                <Link className={styles.textLink} href="/standings">View current standings <span aria-hidden="true">→</span></Link>
              </section>

              <section className={styles.section} id="ratings">
                <SectionHeading number="05" eyebrow="PLAYER PERFORMANCE" title="Clash Index (CI)" />
                <p className={styles.sectionLead}>Clash Index measures individual match-play performance, distinct from a team&apos;s points and standings.</p>
                <div className={styles.ruleGrid}>
                  <RuleItem title="Strength of opponent">CI movement considers the result relative to the strength of the opponent.</RuleItem>
                  <RuleItem title="Singles & doubles">Both formats contribute to CI. Singles has a stronger effect than doubles.</RuleItem>
                  <RuleItem title="PDGA vs. CI">PDGA ratings help establish starting CI. Once the season is underway, Clash match results move the rating.</RuleItem>
                </div>
                <Link className={styles.textLink} href="/clash-index">How Clash Index works <span aria-hidden="true">→</span></Link>
              </section>

              <section className={[styles.section, styles.reviewSection].join(' ')} id="review">
                <SectionHeading number="06" eyebrow="COMMISSIONER REVIEW" title="Policies to finalize" />
                <p className={styles.sectionLead}>These topics have been discussed for the league, but exact wording and enforcement should be approved before this page becomes the official rulebook.</p>
                <div className={styles.reviewList}>
                  <div><span>01</span><div><strong>Women&apos;s participation protections</strong><p>Reserved spots, singles pairings, mixed doubles, bonus opportunities, and the ability to borrow an eligible rostered woman.</p></div></div>
                  <div><span>02</span><div><strong>No-shows & roster penalties</strong><p>Point values for absent rostered players and additional penalties if the player was placed into a matchup.</p></div></div>
                  <div><span>03</span><div><strong>Playoff format & eligibility</strong><p>Qualification, seeding, tie resolution, and semifinal/final procedures.</p></div></div>
                  <div><span>04</span><div><strong>Disputes & exceptions</strong><p>Captain challenges, commissioner corrections, weather delays, and what happens when a match cannot be completed.</p></div></div>
                </div>
                <p className={styles.reviewFoot}>Items in this section are editorial placeholders, not enforceable published rules.</p>
              </section>

              <div className={styles.bottomLinks}>
                <Link href="/schedule">Schedule <span aria-hidden="true">→</span></Link>
                <Link href="/standings">Standings <span aria-hidden="true">→</span></Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function SectionHeading({number, eyebrow, title}: {number: string; eyebrow: string; title: string}) {
  return (
    <div className={styles.sectionHeading}>
      <span className={styles.sectionNumber}>{number}</span>
      <div><span className={styles.sectionEyebrow}>{eyebrow}</span><h2>{title}</h2></div>
    </div>
  );
}

function RuleItem({title, children}: {title: string; children: ReactNode}) {
  return <div className={styles.ruleItem}><h3>{title}</h3><p>{children}</p></div>;
}
