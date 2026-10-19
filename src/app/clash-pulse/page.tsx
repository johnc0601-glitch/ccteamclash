import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {PulseFactLibrary} from '@/components/commissioner/PulseFactLibrary';
import {hasSupabaseConfig} from '@/lib/supabase';
import {requireClashPulseReader} from '@/services/pulse/PulseReaderAccess';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Clash Pulse Research | CC Team Clash',
  description: 'League research facts for explicitly approved Clash Pulse readers.',
};

export default async function ClashPulseReaderPage() {
  if (!hasSupabaseConfig()) redirect('/account?error=Clash%20Pulse%20is%20not%20configured.');
  try {
    await requireClashPulseReader();
  } catch {
    redirect('/account?error=Approved%20Clash%20Pulse%20reader%20access%20is%20required.');
  }
  return (
    <main style={{maxWidth: 1100, margin: '0 auto', padding: '30px 18px 80px'}}>
      <header style={{marginBottom: 24}}>
        <span style={{fontSize: 12, textTransform: 'uppercase', letterSpacing: '.12em', opacity: .7}}>League research</span>
        <h1 style={{margin: '6px 0 10px'}}>Clash Pulse</h1>
        <p style={{maxWidth: 740, opacity: .8}}>
          Research results, upsets, CI movement, and history by round.
          This is read-only access. Pending facts are marked for review;
          hidden and superseded facts are not shown.
        </p>
      </header>
      <PulseFactLibrary readOnly />
    </main>
  );
}
