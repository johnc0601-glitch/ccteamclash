import {notFound} from 'next/navigation';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {getStoryBySlug} from '@/services/stories/StoryService';

export const dynamic = 'force-dynamic';

export default async function Page({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const story = await getStoryBySlug(slug);

  if (!story) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="article shell">
        <Link href="/stories" className="back">&lt;- All stories</Link>
        <span className="eyebrow">{story.category} | {story.date}</span>
        <h1>{story.title}</h1>
        <p className="article-lead">{story.excerpt}</p>
        <StoryPhoto className="article-image" image={story.image}>ADD STORY PHOTO</StoryPhoto>
        <div className="article-copy">
          {story.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {story.links?.map((link) => (
            <Link className="button" href={link.url} key={link.label}>{link.label}</Link>
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
      {children}
    </div>
  );
}
