import Link from 'next/link';
import {AroundTheClashDesk} from '@/components/commissioner/AroundTheClashDesk';
import {ClashPulseLiveManager} from '@/components/commissioner/ClashPulseLiveManager';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {getClashPulseFactData} from '@/services/stories/ClashPulseFactCandidateService';

export default async function ClashPulsePage() {
  const factData = await getClashPulseFactData();

  return (
    <OfficePage sectionId="media">
      <section style={{display: 'grid', gap: 18}}>
        <header style={{display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap'}}>
          <div>
            <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
              <h2 style={{margin: 0}}>Clash Pulse</h2>
              <span style={{fontSize: 12, fontWeight: 800, letterSpacing: '.08em', border: '1px solid currentColor', borderRadius: 999, padding: '3px 8px'}}>VERIFIED DATA</span>
            </div>
            <p style={{marginBottom: 0}}>Find named league facts, build the Pulse Queue, and publish the strongest ones to the homepage.</p>
          </div>
          <Link href="/office/media">Back to Media</Link>
        </header>

        <AroundTheClashDesk factData={factData} />
        <ClashPulseLiveManager />
      </section>
    </OfficePage>
  );
}
