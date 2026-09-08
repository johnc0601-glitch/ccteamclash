import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import styles from './ClashIndex.module.css';

export default function ClashIndexPage() {
  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <header className={styles.hero}>
          <span className="eyebrow">Player ratings</span>
          <h1>Clash Index</h1>
          <p>How CI works in Coastal Clash match play.</p>
        </header>

        <section className={styles.content}>
          <p className={styles.lead}>
            <strong>Clash Index (CI) is Coastal Clash&apos;s match-play player rating.</strong>
          </p>

          <p>CI reflects how you perform against the competition you face.</p>

          <ul className={styles.movementList}>
            <li><strong>Beat a stronger player</strong><span>Your CI may rise more because the result was less expected.</span></li>
            <li><strong>Beat someone you were favored against</strong><span>Your CI may rise a little.</span></li>
            <li><strong>Lose to a stronger player</strong><span>Your CI may drop only slightly.</span></li>
            <li><strong>Lose as the favorite</strong><span>Your CI may drop more.</span></li>
          </ul>

          <p className={styles.callout}><strong>CI is meant to add context to match results — not become the focus of the match.</strong></p>

          <h2>Singles</h2>
          <p>
            Singles has the strongest effect on your individual CI. The system compares your CI with your opponent&apos;s before the match and calculates an expected result. Your CI then moves based on the actual result.
          </p>

          <h2>Doubles</h2>
          <p>
            Doubles counts toward CI too, but each player receives a smaller adjustment than they would in singles. The strength of the doubles team is based on both partners&apos; CI ratings.
          </p>

          <h2>Home Matches</h2>
          <p>
            In singles, the system also accounts for home-course advantage when calculating the expected result.
          </p>

          <h2>Starting CI</h2>
          <p>
            New players generally start from their PDGA rating when one is available. Returning players begin a new season with a rating based mostly on their previous Clash Index, with a smaller influence from their current PDGA rating.
          </p>

          <h2>CI vs. PDGA Rating</h2>
          <p>
            <strong>PDGA rating</strong> measures performance in rated rounds. <strong>Clash Index</strong> measures performance in Coastal Clash match play.
          </p>
          <p>Once the season begins, your Clash results determine how your CI moves.</p>

          <p className={styles.finish}><strong>Win against good competition, outperform expectations, and your CI will rise.</strong></p>

          <Link className={styles.backLink} href="/stats">← Back to Stats</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
