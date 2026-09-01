import type {Metadata} from 'next';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {getPublicGalleryAssets, getPublicGalleryFacets} from '@/services/media/MediaLibraryService';
import styles from './photos.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Photos | CC Team Clash',
  description: 'Photos from CC Team Clash matches, teams, courses, and league events.',
};

type PhotosPageProps = {
  searchParams?: Promise<{season?: string; team?: string; match?: string}>;
};

export default async function PhotosPage({searchParams}: PhotosPageProps) {
  const query = searchParams ? await searchParams : {};
  const filters = {
    seasonId: cleanFilter(query.season),
    teamId: cleanFilter(query.team),
    matchId: cleanFilter(query.match),
  };
  const [assets, facets] = await Promise.all([
    getPublicGalleryAssets(72, filters),
    getPublicGalleryFacets(),
  ]);
  const hasFilters = Boolean(filters.seasonId || filters.teamId || filters.matchId);
  const hasFacets = facets.seasons.length > 0 || facets.teams.length > 0 || facets.matches.length > 0;

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className="shell">
        <section className={styles.hero}>
          <span>League media</span>
          <h1>Photos</h1>
          <p>Photos from Team Clash matches, courses, teams, and league weekends.</p>
        </section>

        {hasFacets ? (
          <form className={styles.filters} method="get" action="/photos">
            {facets.seasons.length ? (
              <label>
                <span>Season</span>
                <select name="season" defaultValue={filters.seasonId ?? ''}>
                  <option value="">All seasons</option>
                  {facets.seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}
                </select>
              </label>
            ) : null}
            {facets.teams.length ? (
              <label>
                <span>Team</span>
                <select name="team" defaultValue={filters.teamId ?? ''}>
                  <option value="">All teams</option>
                  {facets.teams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}
                </select>
              </label>
            ) : null}
            {facets.matches.length ? (
              <label className={styles.matchFilter}>
                <span>Match</span>
                <select name="match" defaultValue={filters.matchId ?? ''}>
                  <option value="">All matches</option>
                  {facets.matches.map((match) => <option key={match.id} value={match.id}>{match.label}</option>)}
                </select>
              </label>
            ) : null}
            <div className={styles.filterActions}>
              <button type="submit">Filter photos</button>
              {hasFilters ? <a href="/photos">Clear</a> : null}
            </div>
          </form>
        ) : null}

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
          <div className={styles.empty}>{hasFilters ? 'No public photos match those filters.' : 'No public photos have been posted yet.'}</div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function cleanFilter(value: string | undefined): string | undefined {
  const cleaned = value?.trim().slice(0, 160);
  return cleaned || undefined;
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
