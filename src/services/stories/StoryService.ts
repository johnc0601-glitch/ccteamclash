import {list, put} from '@vercel/blob';
import type {Story, StoryLink} from '@/shared/types';
import {seedStories} from '@/data/stories';
import {createSlug} from '@/shared/utils';

const STORY_STORE_PATH = 'content/stories.json';
const STORY_STORE_TIMEOUT_MS = 2500;

type StoryPayload = {
  stories: Story[];
};

export async function getStories(): Promise<Story[]> {
  if (!isBlobConnected()) {
    return seedStories;
  }

  try {
    const result = await withTimeout(list({
      prefix: STORY_STORE_PATH,
      limit: 1,
    }));
    const storyBlob = result.blobs.find((blob) => blob.pathname === STORY_STORE_PATH);

    if (!storyBlob) {
      return seedStories;
    }

    const response = await fetch(storyBlob.url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(STORY_STORE_TIMEOUT_MS),
    });
    if (!response.ok) {
      return seedStories;
    }

    const payload = await response.json() as Partial<StoryPayload>;
    return normalizeStories(payload.stories);
  } catch {
    return seedStories;
  }
}

export async function getStoryBySlug(slug: string): Promise<Story | undefined> {
  const stories = await getStories();
  return stories.find((story) => story.slug === slug);
}

export async function saveStories(stories: Story[]): Promise<Story[]> {
  if (!isBlobConnected()) {
    throw new Error('Story storage is not connected yet.');
  }

  const normalizedStories = normalizeStories(stories);
  await put(STORY_STORE_PATH, JSON.stringify({stories: normalizedStories}, null, 2), {
    access: 'public',
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: 'application/json',
  });

  return normalizedStories;
}

function normalizeStories(stories: unknown): Story[] {
  if (!Array.isArray(stories)) {
    return seedStories;
  }

  const normalized = stories
    .map(normalizeStory)
    .filter((story): story is Story => Boolean(story));

  return normalized.length ? normalized : seedStories;
}

function normalizeStory(value: unknown): Story | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const story = value as Partial<Story>;
  const title = cleanText(story.title);
  if (!title) {
    return null;
  }

  return {
    slug: createSlug(cleanText(story.slug) || title),
    title,
    excerpt: cleanText(story.excerpt),
    category: cleanText(story.category) || 'Announcement',
    date: cleanText(story.date) || 'Date to be announced',
    image: cleanText(story.image) || 'hero',
    body: Array.isArray(story.body)
      ? story.body.map(cleanText).filter(Boolean)
      : [],
    links: normalizeLinks(story.links),
  };
}

function normalizeLinks(links: unknown): StoryLink[] | undefined {
  if (!Array.isArray(links)) {
    return undefined;
  }

  const normalizedLinks = links
    .map((link) => {
      if (!link || typeof link !== 'object') {
        return null;
      }

      const candidate = link as Partial<StoryLink>;
      const label = cleanText(candidate.label);
      const url = cleanText(candidate.url);

      return label && url ? {label, url} : null;
    })
    .filter((link): link is StoryLink => Boolean(link));

  return normalizedLinks.length ? normalizedLinks : undefined;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isBlobConnected(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Story storage timed out.')), STORY_STORE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
