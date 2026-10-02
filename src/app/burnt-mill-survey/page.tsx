import type {Metadata} from 'next';
import {SurveyForm} from './SurveyForm';
import styles from './BurntMillSurvey.module.css';

export const metadata: Metadata = {
  title: 'Burnt Mill Creek Disc Golf Course Community Survey',
  description: 'Community input survey about a possible permanent public disc golf course at Burnt Mill Creek in Wilmington, North Carolina.',
};

export default function BurntMillSurveyPage() {
  return (
    <>
      <main className={styles.page}>
        <div className={styles.udiscStrip}>
          <a
            className={styles.udiscCard}
            href="https://udisc.com/courses/burnt-mill-creek-temp-elW1"
            target="_blank"
            rel="noreferrer"
            aria-label="View Burnt Mill Creek Clash Gold and Clash Blue layouts on UDisc"
          >
            <span className={styles.udiscTopLine}>
              <span className={styles.udiscBrand}>
                <img
                  className={styles.udiscLogo}
                  src="https://commons.wikimedia.org/wiki/Special:Redirect/file/UDisc_logo_2021_%28light-on-dark%29.svg"
                  alt="UDisc"
                  loading="eager"
                  decoding="async"
                />
                <span className={styles.udiscLabel}>Layouts</span>
              </span>
              <span className={styles.udiscBadge}>Course maps</span>
            </span>
            <span className={styles.udiscBottomLine}>
              <span className={styles.udiscSubtitle}>Clash Gold • Clash Blue</span>
              <span className={styles.udiscAction}>View <span aria-hidden="true">›</span></span>
            </span>
          </a>
        </div>

        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.kicker}>Wilmington, North Carolina</span>
            <h1>Burnt Mill Creek Disc Golf Course</h1>
            <p className={styles.heroLead}>Community Interest Survey</p>
          </div>
        </section>

        <div className={styles.shell}>
          <section className={styles.introCard} aria-labelledby="survey-intro">
            <span className={styles.eyebrow}>Community feedback</span>
            <h2 id="survey-intro">Share your opinion</h2>
            <p>
              Following a meeting with Wilmington Parks &amp; Recreation, community feedback is being
              collected on whether a permanent public disc golf course should be installed at Burnt Mill Creek.
              Parks &amp; Recreation staff asked the organizers to collect community feedback following that meeting.
            </p>
            <p>
              This survey is community-organized and is <strong>not an official City of Wilmington survey</strong>.
              Responses will be summarized and shared with Parks &amp; Recreation.
            </p>
            <div className={styles.metaRow}>
              <span>About 1 minute</span>
              <span>No name or email required</span>
              <span>One response per person</span>
            </div>
          </section>

          <SurveyForm />

          <aside className={styles.methodNote}>
            <strong>About the results</strong>
            <p>
              This is an open, self-selected community input survey. Results describe the people who respond
              and should not be interpreted as a statistically representative poll of all Wilmington residents.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
