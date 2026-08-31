import type {Metadata} from 'next';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {getPublicGalleryAssets} from '@/services/media/MediaLibraryService';
import styles from './photos.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Photos | CC Team Clash',
  description: 'Photos from CC Team Clash matches, teams, courses, and league events.',
};

export default async function PhotosPage() {
  const assets = await getPublicGalleryAssets();

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className="shell">
        <section className={styles.hero}>
          <span>League media</span>
          <h1>Photos</h1>
          <p>Photos from Team Clash matches, courses, teams, and league weekends.</p>
        </section>

        {assets.length ? (
          <section className={styles.grid} aria-label="CC Team Clash photo gallery">
            {assets.map((asset) => (
              <figure className={styles.card} key={asset.id}>
                <a href={asset.url} target="_blank" rel="noreferrer" aria-label="Open full-size photo">
                  <img
                    className={styles.photo}
                    src={asset.thumbnailUrl}
                    alt={asset.altText || asset.caption || 'CC Team Clash photo'}
                    loading="lazy"
                    width={asset.width ?? undefined}
                    height={asset.height ?? undefined}
                  />
                </a>
                {asset.caption || asset.takenAt ? (
                  <figcaption className={styles.caption}>
                    {asset.caption ? <strong>{asset.caption}</strong> : null}
                    {asset.takenAt ? <small>{formatPhotoDate(asset.takenAt)}</small> : null}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </section>
        ) : (
          <div className={styles.empty}>No public photos have been posted yet.</div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function formatPhotoDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
