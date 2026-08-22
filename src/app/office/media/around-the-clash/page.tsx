import Link from 'next/link';
import {OfficePage} from '@/components/commissioner/OfficePage';

const categories = ['Upsets', 'CI Gaps', 'Above Expected', 'Road', 'Home', 'Singles', 'Doubles', 'CI +/-', 'Closest'];

export default function AroundTheClashPreviewPage() {
  return (
    <OfficePage sectionId="media">
      <section style={{display: 'grid', gap: 18}}>
        <header style={{display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap'}}>
          <div>
            <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
              <h2 style={{margin: 0}}>Around the Clash</h2>
              <span style={{fontSize: 12, fontWeight: 800, letterSpacing: '.08em', border: '1px solid currentColor', borderRadius: 999, padding: '3px 8px'}}>PREVIEW</span>
            </div>
            <p style={{marginBottom: 0}}>Commissioner stats desk. Matchday results will populate these rankings automatically.</p>
          </div>
          <Link href="/office/media">Back to Media</Link>
        </header>

        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}} aria-label="Stats scope preview">
          <button type="button" disabled>Current Round</button>
          <button type="button" disabled>Match</button>
          <button type="button" disabled>Season</button>
          <button type="button" disabled>All-Time</button>
        </div>

        <nav style={{display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4}} aria-label="Around the Clash categories">
          {categories.map((category, index) => (
            <span key={category} style={{whiteSpace: 'nowrap', border: '1px solid currentColor', borderRadius: 999, padding: '6px 10px', fontWeight: index === 0 ? 800 : 500}}>
              {category}
            </span>
          ))}
        </nav>

        <section style={{border: '1px solid rgba(127,127,127,.35)', borderRadius: 12, padding: 16}}>
          <h3 style={{marginTop: 0}}>Biggest Upsets</h3>
          <p style={{marginBottom: 0}}>No rated Matchday results yet. When results are published, wins will appear here ranked by lowest pre-match win probability.</p>
        </section>

        <aside style={{borderTop: '1px solid rgba(127,127,127,.35)', paddingTop: 14}}>
          <strong>Selected stories (0)</strong>
          <p style={{marginBottom: 0}}>Tap Add beside a ranked result to collect items for the round recap.</p>
        </aside>
      </section>
    </OfficePage>
  );
}
