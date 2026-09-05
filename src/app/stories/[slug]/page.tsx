import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {StoryComments} from '@/components/stories/StoryComments';
import {getMediaAssetById} from '@/services/media/MediaLibraryService';
import {getStoryBySlug} from '@/services/stories/StoryService';
import {formatStoryDate, getStoryPreview} from '@/services/stories/storyPresentation';

export const dynamic = 'force-dynamic';

type StoryQuery = {storyNotice?: string; storyError?: string};
type StoryPageProps = {
  params: Promise<{slug: string}>;
  searchParams?: Promise<StoryQuery>;
};

export async function generateMetadata({params}: StoryPageProps): Promise<Metadata> {
  const {slug} = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return {};

  const description = getStoryPreview(story);
  const image = isImageUrl(story.image) ? story.image : undefined;
  const asset = story.heroAssetId ? await getMediaAssetById(story.heroAssetId) : null;
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
  const story = await getStoryBySlug(slug);

  if (!story) notFound();

  const asset = story.heroAssetId ? await getMediaAssetById(story.heroAssetId) : null;
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
          {story.body.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 40)}`}>{paragraph}</p>)}
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
