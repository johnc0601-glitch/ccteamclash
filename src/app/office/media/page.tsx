import Link from 'next/link';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {StoryManager} from '@/components/StoryManager';

const mediaCardStyle = {
  border: '1px solid rgba(127,127,127,.35)',
  borderRadius: 12,
  padding: 16,
} as const;

export default function OfficeMediaPage() {
  return (
    <OfficePage sectionId="media">
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 20}}>
        <section style={mediaCardStyle}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
            <div>
              <strong>Photo Library</strong>
              <p style={{margin: '6px 0 0'}}>Upload once, reuse photos in stories, and choose which images appear in the public gallery.</p>
            </div>
            <Link href="/office/media/photos">Open photo library</Link>
          </div>
        </section>

        <section style={mediaCardStyle}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                <strong>Around the Clash</strong>
                <span style={{fontSize: 11, fontWeight: 800, letterSpacing: '.08em', border: '1px solid currentColor', borderRadius: 999, padding: '2px 7px'}}>PREVIEW</span>
              </div>
              <p style={{margin: '6px 0 0'}}>Browse ranked Matchday statistics and collect the best items for round coverage.</p>
            </div>
            <Link href="/office/media/around-the-clash">Open stats desk</Link>
          </div>
        </section>
      </div>
      <StoryManager />
    </OfficePage>
  );
}
