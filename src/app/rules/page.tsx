import type {Metadata} from 'next';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {RulesDocument} from '@/components/rules/RulesDocument';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'League Rules | Coastal Carolina Team Clash',
  description: 'Search and read the Coastal Carolina Team Clash league charter and match rules.',
  alternates: {canonical: '/rules'},
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
        <RulesDocument />
      </main>
      <Footer />
    </>
  );
}
