import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {cache} from 'react';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StoryComments} from '@/components/stories/StoryComments';
import {getMediaAssetById} from '@/services/media/MediaLibraryService';
import {getStoryBySlug} from '@/services/stories/StoryService';
import {formatStoryDate, getStoryPreview} from '@/services/stories/storyPresentation';

export const dynamic = 'force-dynamic';

const getCachedStoryBySlug = cache(getStoryBySlug);
const getCachedMediaAssetById = cache(getMediaAssetById);

type StoryQuery = {storyNotice?: string; storyError?: string};
type StoryPageProps = {
  params: Promise<{slug: string}>;
  searchParams?: Promise<StoryQuery>;
};

export async function generateMetadata({params}: StoryPageProps): Promise<Metadata> {
  const {slug} = await params;
  const story = await getCachedStoryBySlug(slug);
  if (!story) return {};

  const description = getStoryPreview(story);
  const image = isImageUrl(story.image) ? story.image : undefined;
  const asset = story.heroAssetId ? await getCachedMediaAssetById(story.heroAssetId) : null;
  const imageAlt = asset?.altText || story.title;

  return {
    title: `${story.title} | CC Team Clash`,
    description,
    alternates: {canonical: `/stories/${story.slug}`},
    openGraph: {
      type: 'article',
      title: story.title,
      description,
      publishedTime: story.publishedAt ?? undefined,
      images: image ? [{url: image, alt: imageAlt}] : undefined,
    },
  };
}

export default async function Page({params, searchParams}: StoryPageProps) {
  const {slug} = await params;
  const query: StoryQuery = searchParams ? await searchParams : {};
  const story = await getCachedStoryBySlug(slug);

  if (!story) notFound();

  const asset = story.heroAssetId ? await getCachedMediaAssetById(story.heroAssetId) : null;
  const heroAlt = asset?.altText || story.title;

  return (
    <>
      <SiteHeader />
      <main className="article shell">
        <Link href="/stories" className="back">&lt;- All stories</Link>
        <span className="eyebrow">{story.category} | {formatStoryDate(story.publishedAt)}</span>
        <h1>{story.title}</h1>
        <StoryPhoto className="article-image" image={story.image} alt={heroAlt} />
        <div className="article-copy">
          {story.body.map((paragraph, index) => (
            <StoryBodyBlock
              key={`${index}-${paragraph.slice(0, 40)}`}
              paragraph={paragraph}
            />
          ))}
          {story.links?.map((link) => (
            <Link className="button" href={link.url} key={`${link.label}-${link.url}`}>{link.label}</Link>
          ))}
        </div>
        <StoryComments
          storyId={story.id}
          storySlug={story.slug}
          notice={query.storyNotice}
          error={query.storyError}
        />
      </main>
      <Footer />
    </>
  );
}


function StoryBodyBlock({paragraph}: {paragraph: string}) {
  const trimmed = paragraph.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('### ')) {
    return <h3 className="article-subheading article-subheading-small">{renderInline(trimmed.slice(4))}</h3>;
  }
  if (trimmed.startsWith('## ')) {
    return <h2 className="article-subheading">{renderInline(trimmed.slice(3))}</h2>;
  }

  const lines = trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0 && lines.every((line) => /^[-*] /.test(line))) {
    return <ul className="article-list">{lines.map((line, index) => <li key={index}>{renderInline(line.slice(2))}</li>)}</ul>;
  }
  if (lines.length > 0 && lines.every((line) => /^\d+\. /.test(line))) {
    return <ol className="article-list">{lines.map((line, index) => <li key={index}>{renderInline(line.replace(/^\d+\. /, ''))}</li>)}</ol>;
  }

  return (
    <p className="article-paragraph">
      {lines.map((line, index) => (
        <span className="article-line" key={index}>{renderInline(line)}</span>
      ))}
    </p>
  );
}

function renderInline(value: string) {
  const tokens = value.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g);
  return tokens.map((token, index) => {
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a className="article-link" href={link[2]} target="_blank" rel="noopener noreferrer" key={index}>{link[1]}</a>;
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('__') && token.endsWith('__')) return <u key={index}>{token.slice(2, -2)}</u>;
    if (token.startsWith('*') && token.endsWith('*')) return <em key={index}>{token.slice(1, -1)}</em>;
    if (/^https?:\/\/\S+$/.test(token)) return <a className="article-link" href={token} target="_blank" rel="noopener noreferrer" key={index}>{token.replace(/^https?:\/\//, '')}</a>;
    return token;
  });
}

function StoryPhoto({className, image, alt}: {className: string; image: string; alt: string}) {
  const isUrl = isImageUrl(image);

  return (
    <div
      className={isUrl ? className : `${className} ${image}`}
      style={isUrl ? {backgroundImage: `url(${image})`} : undefined}
      aria-label={isUrl ? alt : 'CC Team Clash story artwork'}
      role="img"
    >
      {isUrl ? null : <span>TEAM CLASH</span>}
    </div>
  );
}

function isImageUrl(image: string): boolean {
  return image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/');
}
