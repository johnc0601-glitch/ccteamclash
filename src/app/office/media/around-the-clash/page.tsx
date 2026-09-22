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
            <p style={{marginBottom: 0}}>Find the league facts worth surfacing, build a Pulse Queue, and review what will eventually publish to the public Clash Pulse bar.</p>
          </div>
          <Link href="/office/media">Back to Media</Link>
        </header>

        <div style={{border: '1px solid rgba(127,127,127,.35)', borderRadius: 10, padding: 12, fontSize: 13}}>
          <strong>Safe preview mode.</strong> The facts below are interface fixtures, not league records. You can test filtering and selection, but publishing is disabled.
        </div>

        <AroundTheClashDesk />
      </section>
    </OfficePage>
  );
}
