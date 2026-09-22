import Link from 'next/link';
import {AroundTheClashDesk} from '@/components/commissioner/AroundTheClashDesk';
import {OfficePage} from '@/components/commissioner/OfficePage';

export default function ClashPulsePreviewPage() {
  return (
    <OfficePage sectionId="media">
      <section style={{display: 'grid', gap: 18}}>
        <header style={{display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap'}}>
          <div>
            <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
              <h2 style={{margin: 0}}>Clash Pulse</h2>
              <span style={{fontSize: 12, fontWeight: 800, letterSpacing: '.08em', border: '1px solid currentColor', borderRadius: 999, padding: '3px 8px'}}>PREVIEW</span>
            </div>
            <p style={{marginBottom: 0}}>Find the league facts worth surfacing, build the Pulse Queue, and review the publishing flow.</p>
          </div>
          <Link href="/office/media">Back to Media</Link>
        </header>

        <AroundTheClashDesk />
      </section>
    </OfficePage>
  );
}
