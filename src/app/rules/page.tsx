import type {Metadata} from 'next';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {RulesDocument} from '@/components/rules/RulesDocument';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'League Rules | Coastal Carolina Team Clash',
  description: 'Search and read the Coastal Carolina Team Clash league charter and match rules.',
};

export default function RulesPage() {
  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <header className={styles.hero}>
          <span className="eyebrow">Coastal Carolina Team Clash</span>
          <h1>League Rules</h1>
          <p>Search and browse the complete Coastal Carolina Team Clash charter.</p>
        </header>
        <aside className={styles.reviewNote} aria-label="Charter review status">
          <strong>2026–27 working draft</strong>
          <p>Based on the full 2025–26 charter. The official match roster is now due <strong>Friday at 12:00 PM (noon) Eastern</strong>, immediately before the scheduled match. The former 24-hour deadline is replaced; the 3:00 PM website setting does not define the league rule.</p>
          <p>Historical season dates, team information and any other unreviewed provisions remain from the 2025–26 charter for comparison. They should not be treated as newly approved 2026–27 rules.</p>
        </aside>
        <RulesDocument />
      </main>
      <Footer />
    </>
  );
}
