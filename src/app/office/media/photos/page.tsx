import Link from 'next/link';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {MediaLibraryManager} from '@/components/media/MediaLibraryManager';

export default function OfficeMediaPhotosPage() {
  return (
    <OfficePage sectionId="media">
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18}}>
        <div>
          <h1 style={{margin: 0}}>Photo Library</h1>
          <p style={{margin: '6px 0 0'}}>Upload once, then reuse league photos across stories and galleries.</p>
        </div>
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
          <Link href="/photos">View public gallery</Link>
          <Link href="/office/media">Back to Media</Link>
        </div>
      </div>
      <MediaLibraryManager />
    </OfficePage>
  );
}
