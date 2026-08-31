import type {Story} from '@/shared/types';

export function getStoryPreview(story: Pick<Story, 'body'>, maxLength = 170): string {
  const clean = story.body.join(' ').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= maxLength) return clean;

  const cutoff = Math.max(1, maxLength - 3);
  const candidate = clean.slice(0, cutoff);
  const lastSpace = candidate.lastIndexOf(' ');
  const trimmed = (lastSpace > cutoff * 0.65 ? candidate.slice(0, lastSpace) : candidate).trimEnd();
  return `${trimmed}...`;
}

export function formatStoryDate(publishedAt: string | null): string {
  if (!publishedAt) return 'Not published';
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return 'Not published';

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function storyDateInputValue(publishedAt: string | null): string {
  if (!publishedAt) return '';
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
