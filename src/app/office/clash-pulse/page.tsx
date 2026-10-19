import Link from 'next/link';
import {AroundTheClashDesk} from '@/components/commissioner/AroundTheClashDesk';
import {RoundPulsePanel} from '@/components/commissioner/RoundPulsePanel';
import {ClashPulseLiveManager} from '@/components/commissioner/ClashPulseLiveManager';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {getClashPulseFactData} from '@/services/stories/ClashPulseFactCandidateService';
import {CollapsiblePulseFactLibrary} from '@/components/commissioner/CollapsiblePulseFactLibrary';
import {requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';

export default async function CommissionerClashPulsePage() {
  const [factData] = await Promise.all([
    getClashPulseFactData(),
    requireStoryCommissioner(),
  ]);

  return (
    <OfficePage sectionId="clashPulse">
      <section style={{display: 'grid', gap: 18}}>
        <header style={{display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap'}}>
          <div>
            <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
              <h2 style={{margin: 0}}>Clash Pulse desk</h2>
              <span style={{fontSize: 12, fontWeight: 800, letterSpacing: '.08em', border: '1px solid currentColor', borderRadius: 999, padding: '3px 8px'}}>VERIFIED DATA</span>
            </div>
            <p style={{marginBottom: 0}}>Find league facts, manage the Pulse Queue, and publish updates to the homepage.</p>
          </div>
          <Link href="/office">Office dashboard</Link>
        </header>
        <RoundPulsePanel />
        <RoundPulsePanel />
      <AroundTheClashDesk factData={factData} />
        <ClashPulseLiveManager />
        <CollapsiblePulseFactLibrary />
      </section>
    </OfficePage>
  );
}
