'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import type {Story, StoryLink} from '@/shared/types';
import {createSlug} from '@/shared/utils';

type StoryDraft = {
  slug: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  body: string;
  links: string;
  image: string;
};

const blankDraft: StoryDraft = {
  slug: '',
  title: '',
  category: 'Match Preview',
  date: '',
  excerpt: '',
  body: '',
  links: '',
  image: 'hero',
};

const storyCategories = [
  'Match Preview',
  'Match Recap',
  'Team News',
  'Course Report',
  'Announcement',
  'Photo Story',
];

export function StoryManager() {
  const [stories, setStories] = useState<Story[]>([]);
  const [draft, setDraft] = useState<StoryDraft>(blankDraft);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [status, setStatus] = useState('Loading stories...');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStories() {
      try {
        const response = await fetch('/api/stories', {cache: 'no-store'});
        const payload = await response.json() as {stories?: Story[]; error?: string};

        if (!response.ok) {
          throw new Error(payload.error || 'Stories could not load.');
        }

        const loadedStories = payload.stories ?? [];
        if (cancelled) {
          return;
        }

        setStories(loadedStories);
        setStatus(loadedStories.length ? 'Choose a story to edit.' : 'No stories have been posted yet.');
        if (loadedStories[0]) {
          selectStory(loadedStories[0]);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Stories could not load.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStories();

    return () => {
      cancelled = true;
    };
  }, []);

  const draftSlug = useMemo(() => (
    createSlug(draft.slug || draft.title) || 'new-story'
  ), [draft.slug, draft.title]);

  function selectStory(story: Story) {
    setSelectedSlug(story.slug);
    setDraft(storyToDraft(story));
  }

  function updateDraft(field: keyof StoryDraft, value: string) {
    setDraft((current) => ({...current, [field]: value}));
    setStatus('Unsaved changes.');
  }

  function startNewStory() {
    setSelectedSlug('');
    setDraft(blankDraft);
    setStatus('New story ready.');
  }

  async function uploadPhoto(file?: File) {
    if (!file) {
      return;
    }

    setUploading(true);
    setStatus('Uploading story photo...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', draft.title || file.name);

      const response = await fetch('/api/story-images', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json() as {url?: string; error?: string};

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Story photo could not upload.');
      }

      updateDraft('image', payload.url);
      setStatus('Photo uploaded. Save the story to publish it.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Story photo could not upload.');
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  }

  async function saveStory() {
    const story = draftToStory(draft, draftSlug);
    if (!story.title) {
      setStatus('Add a headline before saving.');
      return;
    }

    setSaving(true);
    setStatus('Saving story...');

    try {
      const nextStories = selectedSlug
        ? stories.map((item) => item.slug === selectedSlug ? story : item)
        : [story, ...stories];
      await saveStoryList(nextStories);
      setStories(nextStories);
      setSelectedSlug(story.slug);
      setDraft(storyToDraft(story));
      setStatus('Story saved and public pages updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Story could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteStory() {
    if (!selectedSlug) {
      setStatus('Choose a posted story to delete.');
      return;
    }

    const selectedStory = stories.find((story) => story.slug === selectedSlug);
    if (!selectedStory || !window.confirm(`Delete "${selectedStory.title}" from the website?`)) {
      return;
    }

    setSaving(true);
    setStatus('Deleting story...');

    try {
      const nextStories = stories.filter((story) => story.slug !== selectedSlug);
      await saveStoryList(nextStories);
      setStories(nextStories);
      if (nextStories[0]) {
        selectStory(nextStories[0]);
      } else {
        startNewStory();
      }
      setStatus('Story deleted and public pages updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Story could not be deleted.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="story-manager">
      <div className="story-manager-toolbar">
        <div>
          <span className="status-dot" />
          <strong>Story manager</strong>
          <small>{status}</small>
        </div>
        <button className="publish-action" type="button" onClick={startNewStory}>New story</button>
      </div>

      <div className="story-manager-grid">
        <aside className="story-list-panel">
          <h2>Posted stories</h2>
          {loading ? <p>Loading...</p> : null}
          {!loading && stories.length === 0 ? <p>No posted stories yet.</p> : null}
          <div className="story-list">
            {stories.map((story) => (
              <button
                type="button"
                className={story.slug === selectedSlug ? 'story-list-item active' : 'story-list-item'}
                key={story.slug}
                onClick={() => selectStory(story)}
              >
                <strong>{story.title}</strong>
                <span>{story.category} | {story.date}</span>
              </button>
            ))}
          </div>
        </aside>

        <form className="real-editor story-edit-form" onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <label>
              Post type
              <select value={draft.category} onChange={(event) => updateDraft('category', event.target.value)}>
                {storyCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Date
              <input value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} placeholder="July 21, 2026" />
            </label>
          </div>

          <label>
            Headline
            <input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} placeholder="Story headline" />
          </label>

          <label>
            Web address
            <input value={draftSlug} onChange={(event) => updateDraft('slug', event.target.value)} placeholder="story-web-address" />
          </label>

          <label>
            Feature photo
            <div
              className="drop-zone story-photo-zone"
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  fileRef.current?.click();
                }
              }}
            >
              {isImageUrl(draft.image)
                ? <span className="story-photo-preview" style={{backgroundImage: `url(${draft.image})`}} />
                : <><b>+</b><strong>{uploading ? 'Uploading...' : 'Choose a photo'}</strong><small>JPG, PNG, or WebP</small></>}
              <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadPhoto(event.target.files?.[0])} />
            </div>
          </label>

          <label>
            Short summary
            <button type="button" className="inline-tool" onClick={() => updateDraft('excerpt', createSummary(draft.body))}>Create from story</button>
            <textarea rows={3} value={draft.excerpt} onChange={(event) => updateDraft('excerpt', event.target.value)} />
          </label>

          <label>
            Story
            <textarea rows={10} value={draft.body} onChange={(event) => updateDraft('body', event.target.value)} placeholder="Use a blank line between paragraphs." />
          </label>

          <label>
            Related links <small>One per line: Label | URL</small>
            <textarea rows={3} value={draft.links} onChange={(event) => updateDraft('links', event.target.value)} placeholder={'Full schedule | /schedule\nFacebook post | https://...'} />
          </label>

          <div className="editor-actions">
            <button className="publish-action" type="button" disabled={saving || uploading} onClick={saveStory}>
              {saving ? 'Saving...' : 'Save story'}
            </button>
            <button className="secondary" type="button" disabled={saving || !selectedSlug} onClick={deleteStory}>Delete story</button>
          </div>
        </form>

        <aside className="post-preview story-manager-preview">
          <div className="preview-label">Public preview</div>
          {isImageUrl(draft.image)
            ? <span className="story-preview-image" style={{backgroundImage: `url(${draft.image})`}} />
            : <div className={`preview-photo ${draft.image}`}>STORY PHOTO</div>}
          <small>{draft.category}</small>
          <h2>{draft.title || 'Your headline appears here'}</h2>
          <p>{draft.excerpt || createSummary(draft.body) || 'Your short story preview appears here.'}</p>
          <span className="preview-link">Read story -&gt;</span>
        </aside>
      </div>
    </section>
  );
}

async function saveStoryList(stories: Story[]) {
  const response = await fetch('/api/stories', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({stories}),
  });
  const payload = await response.json() as {error?: string};

  if (!response.ok) {
    throw new Error(payload.error || 'Stories could not save.');
  }
}

function storyToDraft(story: Story): StoryDraft {
  return {
    slug: story.slug,
    title: story.title,
    category: story.category,
    date: story.date,
    excerpt: story.excerpt,
    body: story.body.join('\n\n'),
    links: (story.links ?? []).map((link) => `${link.label} | ${link.url}`).join('\n'),
    image: story.image,
  };
}

function draftToStory(draft: StoryDraft, slug: string): Story {
  return {
    slug,
    title: draft.title.trim(),
    category: draft.category.trim() || 'Announcement',
    date: draft.date.trim() || 'Date to be announced',
    excerpt: draft.excerpt.trim() || createSummary(draft.body),
    image: draft.image.trim() || 'hero',
    body: draft.body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
    links: parseLinks(draft.links),
  };
}

function parseLinks(rawLinks: string): StoryLink[] | undefined {
  const links = rawLinks
    .split('\n')
    .map((line) => {
      const [label, ...urlParts] = line.split('|');
      const url = urlParts.join('|').trim();
      return label?.trim() && url ? {label: label.trim(), url} : null;
    })
    .filter((link): link is StoryLink => Boolean(link));

  return links.length ? links : undefined;
}

function createSummary(body: string): string {
  const clean = body.replace(/\s+/g, ' ').trim();
  return clean.length > 155 ? `${clean.slice(0, 152)}...` : clean;
}

function isImageUrl(image: string): boolean {
  return image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/');
}
