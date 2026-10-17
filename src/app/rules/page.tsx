import type {Metadata} from 'next';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {RulesContent} from './RulesContent';
import styles from './Rules.module.css';

export const metadata: Metadata = {
  title: 'League Rules & Charter | CC Team Clash',
  description: 'Team Clash rules based on the 2025–26 Coastal Carolina Team Clash Charter and newer league roster policies.',
};

export default function RulesPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={['shell', styles.heroInner].join(' ')}>
            <div className={styles.heroCopy}>
              <div className={styles.kicker}>COASTAL CAROLINA TEAM CLASH / LEAGUE CHARTER</div>
              <h1>THE LEAGUE <span>RULEBOOK.</span></h1>
              <p>The full league rules, organized for quick reference on matchday. Original charter provisions and newer rules are labeled so captains can see what changed.</p>
              <div className={styles.draftLine}>
                <span className={styles.draftMarker}>WORKING DRAFT</span>
                <span>2025–26 Charter R3 + current-season updates. Review before publication.</span>
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
          <section className={styles.essentials} aria-label="Key match rules at a glance">
            <div><span>STANDARD LINEUP</span><strong>16 + 2</strong><small>men + women</small></div>
            <div><span>STANDARD CLASH</span><strong>36</strong><small>points before adjustments</small></div>
            <div><span>ROSTER SUBMISSION</span><strong>FRI · 12 PM</strong><small>Eastern</small></div>
            <div><span>WEBSITE LOCK</span><strong>FRI · 3 PM</strong><small>Eastern</small></div>
          </section>
          <RulesContent />
        </div>
      </main>
      <Footer />
    </>
  );
}
