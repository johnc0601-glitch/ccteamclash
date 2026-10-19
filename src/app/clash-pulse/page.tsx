import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {AroundTheClashDesk} from '@/components/commissioner/AroundTheClashDesk';
import {CollapsiblePulseFactLibrary} from '@/components/commissioner/CollapsiblePulseFactLibrary';
import {hasSupabaseConfig} from '@/lib/supabase';
import {requireClashPulseReader} from '@/services/pulse/PulseReaderAccess';
import {getClashPulseFactData} from '@/services/stories/ClashPulseFactCandidateService';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Clash Pulse Research | CC Team Clash',
  description: 'League research and verified highlights for approved Clash Pulse readers.',
};

export default async function ClashPulseReaderPage() {
  if (!hasSupabaseConfig()) redirect('/account?error=Clash%20Pulse%20is%20not%20configured.');
  try {
    await requireClashPulseReader();
  } catch {
    redirect('/account?error=Approved%20Clash%20Pulse%20reader%20access%20is%20required.');
  }

  const factData = await getClashPulseFactData({publishedOnly: true});

  return (
    <main style={{maxWidth: 1100, margin: '0 auto', padding: '24px 16px 80px', display: 'grid', gap: 20}}>
      <header>
        <span style={{fontSize: 12, textTransform: 'uppercase', letterSpacing: '.12em', opacity: .7}}>League research</span>
        <h1 style={{margin: '6px 0 10px'}}>Clash Pulse</h1>
        <p style={{maxWidth: 740, opacity: .8}}>
          Browse Top Facts, Upsets, Match Upsets, CI Movers, and historical stories.
          Tap a fact to copy it for Clash Cast or a recap. Read-only access: publishing and commissioner tools stay private.
        </p>
      </header>
      <AroundTheClashDesk factData={factData} readOnly />
      <CollapsiblePulseFactLibrary readOnly />
    </main>
  );
}
