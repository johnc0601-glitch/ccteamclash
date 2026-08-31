import Link from 'next/link';
import type {ReactNode} from 'react';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {getStoryArchive} from '@/services/stories/StoryArchiveService';
import {formatStoryDate, getStoryPreview} from '@/services/stories/storyPresentation';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({searchParams}: {searchParams: SearchParams}) {
  const params = await searchParams;
  const search = first(params.q);
  const category = first(params.category);
  const seasonId = first(params.season);
  const page = positiveInteger(first(params.page));
  const archive = await getStoryArchive({search, category, seasonId, page});

  return (
    <>
      <SiteHeader />
      <main className="shell page-shell">
        <span className="eyebrow">STORY ARCHIVE</span>
        <h1>League stories</h1>

        <form method="get" action="/stories" style={{display: 'grid', gap: 10, margin: '18px 0 24px'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, alignItems: 'end'}}>
            <label style={{display: 'grid', gap: 5}}>
              <span style={{fontSize: 12, fontWeight: 800}}>Search stories</span>
              <input name="q" defaultValue={search} placeholder="Search headline" />
            </label>
            <label style={{display: 'grid', gap: 5}}>
              <span style={{fontSize: 12, fontWeight: 800}}>Category</span>
              <select name="category" defaultValue={category}>
                <option value="">All categories</option>
                {archive.categories.map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>
            <label style={{display: 'grid', gap: 5}}>
              <span style={{fontSize: 12, fontWeight: 800}}>Season</span>
              <select name="season" defaultValue={seasonId}>
                <option value="">All seasons</option>
                {archive.seasons.map((season) => <option value={season.id} key={season.id}>{season.name}</option>)}
              </select>
            </label>
            <button type="submit">Filter</button>
          </div>
          {(search || category || seasonId) ? (
            <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
              <small>{archive.total} matching stor{archive.total === 1 ? 'y' : 'ies'}</small>
              <Link href="/stories">Clear filters</Link>
            </div>
          ) : <small>{archive.total} published stor{archive.total === 1 ? 'y' : 'ies'}</small>}
        </form>

        {archive.stories.length > 0 ? (
          <div className="story-grid">
            {archive.stories.map((story) => (
              <article className="story-card" key={story.id}>
                <StoryPhoto className="story-image" image={story.image}><span>TEAM CLASH</span></StoryPhoto>
                <div className="story-body">
                  <small>{story.category} | {formatStoryDate(story.publishedAt)}</small>
                  <h3>{story.title}</h3>
                  <p>{getStoryPreview(story)}</p>
                  <Link href={`/stories/${story.slug}`}>Read story -&gt;</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div style={{border: '1px solid rgba(127,127,127,.3)', borderRadius: 10, padding: 20}}>
            No stories match these filters.
          </div>
        )}

        {archive.totalPages > 1 ? (
          <nav aria-label="Story archive pages" style={{display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center', marginTop: 28, flexWrap: 'wrap'}}>
            {archive.page > 1 ? <Link href={archiveHref(archive.page - 1, search, category, seasonId)}>Previous</Link> : <span />}
            <strong>Page {archive.page} of {archive.totalPages}</strong>
            {archive.page < archive.totalPages ? <Link href={archiveHref(archive.page + 1, search, category, seasonId)}>Next</Link> : <span />}
          </nav>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

function StoryPhoto({className, image, children}: {className: string; image: string; children: ReactNode}) {
  const isUrl = image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/');

  return (
    <div
      className={isUrl ? className : `${className} ${image}`}
      style={isUrl ? {backgroundImage: `url(${image})`} : undefined}
    >
      {isUrl ? null : children}
    </div>
  );
}

function archiveHref(page: number, search: string, category: string, seasonId: string): string {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (category) params.set('category', category);
  if (seasonId) params.set('season', seasonId);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/stories?${query}` : '/stories';
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function positiveInteger(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}
