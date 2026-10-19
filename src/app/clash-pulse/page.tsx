import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {AroundTheClashDesk} from '@/components/commissioner/AroundTheClashDesk';
import {CollapsiblePulseFactLibrary} from '@/components/commissioner/CollapsiblePulseFactLibrary';
import {hasSupabaseConfig} from '@/lib/supabase';
import {loadPulseOptions} from '@/services/pulse/PulseLibraryService';
import {requireClashPulseReader} from '@/services/pulse/PulseReaderAccess';
import {getClashPulseFactData} from '@/services/stories/ClashPulseFactCandidateService';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Clash Pulse Research | CC Team Clash',
  description: 'League research, highlights, and verified streaks for approved Clash Pulse readers.',
};

export default async function ClashPulseReaderPage() {
  if (!hasSupabaseConfig()) redirect('/account?error=Clash%20Pulse%20is%20not%20configured.');
  let access: Awaited<ReturnType<typeof requireClashPulseReader>>;
  try {
    access = await requireClashPulseReader();
  } catch {
    redirect('/account?error=Approved%20Clash%20Pulse%20reader%20access%20is%20required.');
  }

  const [factData, options] = await Promise.all([
    getClashPulseFactData({publishedOnly: true}),
    loadPulseOptions(access.supabase),
  ]);
  const published = await access.supabase.from('launch_seasons').select('id').eq('published', true);
  if (published.error) throw published.error;
  const publishedIds = new Set((published.data ?? []).map(season => season.id));

  return (
    <main style={{maxWidth: 1100, margin: '0 auto', padding: '24px 16px 80px', display: 'grid', gap: 20}}>
      <header>
        <span style={{fontSize: 12, textTransform: 'uppercase', letterSpacing: '.12em', opacity: .7}}>League research</span>
        <h1 style={{margin: '6px 0 10px'}}>Clash Pulse</h1>
        <p style={{maxWidth: 740, opacity: .8}}>
          Browse Top Facts, Upsets, Match Upsets, CI Movers, Streaks, Broken Streaks, and historical stories.
          Tap a fact to copy it for Clash Cast or a recap. Read-only access: publishing and commissioner tools stay private.
        </p>
      </header>
      <AroundTheClashDesk factData={factData} readOnly
        rounds={options.rounds.filter(round => publishedIds.has(round.season_id))}
        activeSeasonId={options.seasons.find(season => season.active && publishedIds.has(season.id))?.id ?? null}
      />
      <CollapsiblePulseFactLibrary readOnly />
    </main>
  );
}
