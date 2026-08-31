import Link from 'next/link';
import type {ReactNode} from 'react';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {getStories} from '@/services/stories/StoryService';
import {formatStoryDate, getStoryPreview} from '@/services/stories/storyPresentation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const stories = await getStories();

  return (
    <>
      <SiteHeader />
      <main className="shell page-shell">
        <span className="eyebrow">STORY ARCHIVE</span>
        <h1>League stories</h1>
        <div className="story-grid">
          {stories.map((story) => (
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
