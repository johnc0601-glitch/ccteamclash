import Link from 'next/link';
import {AroundTheClashDesk} from '@/components/commissioner/AroundTheClashDesk';
import {OfficePage} from '@/components/commissioner/OfficePage';

export default function AroundTheClashPreviewPage() {
  return (
    <OfficePage sectionId="media">
      <section style={{display: 'grid', gap: 18}}>
        <header style={{display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap'}}>
          <div>
            <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
              <h2 style={{margin: 0}}>Around the Clash</h2>
              <span style={{fontSize: 12, fontWeight: 800, letterSpacing: '.08em', border: '1px solid currentColor', borderRadius: 999, padding: '3px 8px'}}>PULSE PREVIEW</span>
            </div>
            <p style={{marginBottom: 0}}>Commissioner story desk for finding the verified results worth talking about after Matchday.</p>
          </div>
          <Link href="/office/media">Back to Media</Link>
        </header>

        <div style={{border: '1px solid rgba(127,127,127,.35)', borderRadius: 10, padding: 12, fontSize: 13}}>
          <strong>Read-only preview.</strong> Clash Pulse analyzes verified CI facts and ranks potential story leads. Nothing on this screen changes ratings, match results, stories, or database records.
        </div>

        <AroundTheClashDesk />
      </section>
    </OfficePage>
  );
}
