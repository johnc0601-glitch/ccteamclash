'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import type {Story, StoryLink, StorySourceFactSnapshot, StoryStatus} from '@/shared/types';
import {createSlug} from '@/shared/utils';
import {formatStoryDate, getStoryPreview, storyDateInputValue} from '@/services/stories/storyPresentation';

type StoryDraft = {
  slug: string;
  title: string;
  category: string;
  publishedDate: string;
  body: string;
  links: string;
  image: string;
  heroAssetId: string | null;
  featured: boolean;
  status: StoryStatus;
};

const blankDraft: StoryDraft = {
  slug: '',
  title: '',
  category: 'Match Preview',
  publishedDate: '',
  body: '',
  links: '',
  image: 'hero',
  heroAssetId: null,
  featured: false,
  status: 'draft',
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
  const [selectedId, setSelectedId] = useState('');
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);
  const [status, setStatus] = useState('Loading stories...');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetchStoryList()
      .then((loadedStories) => {
        if (cancelled) return;
        setStories(loadedStories);
        setLoadError(false);
        setStatus(loadedStories.length ? 'Choose a story to edit.' : 'No stories have been posted yet.');

        const requestedId = new URLSearchParams(window.location.search).get('story');
        const requestedStory = requestedId ? loadedStories.find((story) => story.id === requestedId) : undefined;
        const initialStory = requestedStory ?? loadedStories[0];
        if (initialStory) selectStory(initialStory);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(true);
        setStatus(error instanceof Error ? error.message : 'Stories could not load.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const draftSlug = useMemo(() => (
    createSlug(draft.slug || draft.title) || 'new-story'
  ), [draft.slug, draft.title]);

  const previewStory = useMemo<Pick<Story, 'body'>>(() => ({
    body: splitBody(draft.body),
  }), [draft.body]);

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedId),
    [stories, selectedId],
  );
  const sourceFacts = selectedStory?.sourceFactSnapshot ?? [];

  function selectStory(story: Story) {
    setSelectedId(story.id);
    setSelectedRevision(story.revision);
    setDraft(storyToDraft(story));
    setStatus(story.status === 'archived' ? 'Archived story selected.' : 'Story loaded.');
  }

  function updateDraft(field: keyof StoryDraft, value: string | boolean | null) {
    setDraft((current) => ({...current, [field]: value}));
    setStatus('Unsaved changes.');
  }

  function startNewStory() {
    if (loadError) {
      setStatus('Stories are unavailable. Reload the page before creating or saving content.');
      return;
    }
    setSelectedId('');
    setSelectedRevision(null);
    setDraft(blankDraft);
    setStatus('New draft ready.');
  }

  async function featureOnHomepage() {
    if (!selectedId || selectedRevision === null || draft.status !== 'published' || draft.featured || loadError) return;

    setSaving(true);
    setStatus('Updating homepage story...');
    try {
      const response = await fetch(`/api/stories/${selectedId}/feature`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({revision: selectedRevision}),
      });
      const payload = await response.json() as {story?: Story; error?: string};
      if (!response.ok || !payload.story) {
        throw new Error(payload.error || 'Homepage story could not be updated.');
      }

      const featuredStory = payload.story;
      setStories((current) => current.map((story) => {
        if (story.id === featuredStory.id) return featuredStory;
        return story.featured ? {...story, featured: false} : story;
      }));
      setSelectedRevision(featuredStory.revision);
      setDraft((current) => ({...current, featured: true}));
      setStatus('Homepage story updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Homepage story could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file?: File) {
    if (!file || loadError) return;

    setUploading(true);
    setStatus('Uploading story photo...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedId) formData.append('storyId', selectedId);

      const response = await fetch('/api/story-images', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json() as {assetId?: string; url?: string; error?: string};

      if (!response.ok || !payload.url || !payload.assetId) {
        throw new Error(payload.error || 'Story photo could not upload.');
      }

      setDraft((current) => ({...current, image: payload.url!, heroAssetId: payload.assetId!}));
      setStatus('Photo uploaded. Save the story when the rest is ready.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Story photo could not upload.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function saveStory(targetStatus: StoryStatus = draft.status) {
    if (loadError) {
      setStatus('Stories are unavailable. Reload the page before saving.');
      return;
    }

    const story = draftToPayload(draft, draftSlug, targetStatus);
    if (!story.title) {
      setStatus('Add a headline before saving.');
      return;
    }
    if (targetStatus === 'published' && story.body.length === 0) {
      setStatus('Add story text before publishing.');
      return;
    }

    setSaving(true);
    setStatus(targetStatus === 'published' ? 'Publishing story...' : 'Saving story...');

    try {
      const response = selectedId
        ? await fetch(`/api/stories/${selectedId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({story, revision: selectedRevision}),
          })
        : await fetch('/api/stories', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({story}),
          });
      const payload = await response.json() as {story?: Story; error?: string};

      if (!response.ok || !payload.story) {
        throw new Error(payload.error || 'Story could not save.');
      }

      await reloadAfterMutation(payload.story.id);
      setStatus(payload.story.status === 'published'
        ? (payload.story.featured ? 'Story published and featured on the homepage.' : 'Story published.')
        : 'Draft saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Story could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function archiveSelectedStory() {
    if (!selectedId || selectedRevision === null) {
      setStatus('Choose a story to archive.');
      return;
    }

    const selectedStoryForArchive = stories.find((story) => story.id === selectedId);
    if (!selectedStoryForArchive || !window.confirm(`Archive "${selectedStoryForArchive.title}"? It will disappear from public pages.`)) {
      return;
    }

    setSaving(true);
    setStatus('Archiving story...');
    try {
      const response = await fetch(`/api/stories/${selectedId}`, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({revision: selectedRevision}),
      });
      const payload = await response.json() as {story?: Story; error?: string};
      if (!response.ok || !payload.story) {
        throw new Error(payload.error || 'Story could not be archived.');
      }

      await reloadAfterMutation(payload.story.id);
      setStatus('Story archived.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Story could not be archived.');
    } finally {
      setSaving(false);
    }
  }

  async function reloadAfterMutation(preferredId: string) {
    const nextStories = await fetchStoryList();
    setStories(nextStories);
    setLoadError(false);
    const preferred = nextStories.find((story) => story.id === preferredId) ?? nextStories[0];
    if (preferred) selectStory(preferred);
    else startNewStory();
  }

  const slugLocked = draft.status !== 'draft' && Boolean(selectedId);
  const previewDate = draft.publishedDate
    ? formatStoryDate(`${draft.publishedDate}T12:00:00.000Z`)
    : (draft.status === 'published' ? 'Publishing today' : 'Draft');

  return (
    <section className="story-manager">
      <div className="story-manager-toolbar">
        <div>
          <span className="status-dot" />
          <strong>Story manager</strong>
          <small>{status}</small>
        </div>
        <button className="publish-action" type="button" disabled={loadError || saving} onClick={startNewStory}>New story</button>
      </div>

      <div className="story-manager-grid">
        <aside className="story-list-panel">
          <h2>Stories</h2>
          {loading ? <p>Loading...</p> : null}
          {!loading && stories.length === 0 ? <p>No stories yet.</p> : null}
          <div className="story-list">
            {stories.map((story) => (
              <button
                type="button"
                className={story.id === selectedId ? 'story-list-item active' : 'story-list-item'}
                key={story.id}
                onClick={() => selectStory(story)}
              >
                <strong>{story.title}{story.featured ? ' · Featured' : ''}</strong>
                <span>
                  {story.status.toUpperCase()} · {story.category} · {formatStoryDate(story.publishedAt)}
                  {(story.sourceFactSnapshot?.length ?? 0) > 0 ? ` · ${story.sourceFactSnapshot!.length} verified fact${story.sourceFactSnapshot!.length === 1 ? '' : 's'}` : ''}
                </span>
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
              Publish date
              <input type="date" value={draft.publishedDate} onChange={(event) => updateDraft('publishedDate', event.target.value)} />
            </label>
          </div>

          <label>
            Headline
            <input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} placeholder="Story headline" />
          </label>

          <label>
            Web address {slugLocked ? <small>Locked after publication</small> : null}
            <input
              value={draftSlug}
              disabled={slugLocked}
              onChange={(event) => updateDraft('slug', event.target.value)}
              placeholder="story-web-address"
            />
          </label>

          <label>
            Feature photo
            <div
              className="drop-zone story-photo-zone"
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileRef.current?.click();
              }}
            >
              {isImageUrl(draft.image)
                ? <span className="story-photo-preview" style={{backgroundImage: `url(${draft.image})`}} />
                : <><b>+</b><strong>{uploading ? 'Uploading...' : 'Choose a photo'}</strong><small>JPG, PNG, or WebP · 10 MB max</small></>}
              <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadPhoto(event.target.files?.[0])} />
            </div>
          </label>

          <label>
            Story
            <textarea rows={13} value={draft.body} onChange={(event) => updateDraft('body', event.target.value)} placeholder="Use a blank line between paragraphs." />
          </label>

          {sourceFacts.length > 0 ? <VerifiedSourceFacts facts={sourceFacts} /> : null}

          <label>
            Related links <small>One per line: Label | URL</small>
            <textarea rows={3} value={draft.links} onChange={(event) => updateDraft('links', event.target.value)} placeholder={'Full schedule | /schedule\nFacebook post | https://...'} />
          </label>

          <div className="editor-actions">
            {draft.status === 'archived' ? (
              <button className="publish-action" type="button" disabled={saving || uploading || loadError} onClick={() => saveStory('draft')}>
                {saving ? 'Saving...' : 'Restore as draft'}
              </button>
            ) : (
              <button className="publish-action" type="button" disabled={saving || uploading || loadError} onClick={() => saveStory(draft.status)}>
                {saving ? 'Saving...' : draft.status === 'published' ? 'Save changes' : 'Save draft'}
              </button>
            )}

            {draft.status !== 'published' ? (
              <button className="secondary" type="button" disabled={saving || uploading || loadError} onClick={() => saveStory('published')}>
                Publish
              </button>
            ) : (
              <button className="secondary" type="button" disabled={saving || draft.featured || loadError} onClick={featureOnHomepage}>
                {draft.featured ? 'Homepage story' : 'Set as homepage story'}
              </button>
            )}

            {selectedId && draft.status !== 'archived' ? (
              <button className="secondary" type="button" disabled={saving || loadError} onClick={archiveSelectedStory}>Archive story</button>
            ) : null}
          </div>
        </form>

        <aside className="post-preview story-manager-preview">
          <div className="preview-label">Public preview · {draft.status}{draft.featured ? ' · Homepage feature' : ''}</div>
          {isImageUrl(draft.image)
            ? <span className="story-preview-image" style={{backgroundImage: `url(${draft.image})`}} />
            : <div className={`preview-photo ${draft.image}`}>TEAM CLASH</div>}
          <small>{draft.category} · {previewDate}</small>
          <h2>{draft.title || 'Your headline appears here'}</h2>
          <p>{getStoryPreview(previewStory) || 'The opening of the story will automatically become the card preview.'}</p>
          <span className="preview-link">Read story -&gt;</span>
        </aside>
      </div>
    </section>
  );
}

function VerifiedSourceFacts({facts}: {facts: StorySourceFactSnapshot[]}) {
  return (
    <section style={{border: '1px solid rgba(127,127,127,.35)', borderRadius: 10, padding: 12, display: 'grid', gap: 10}} aria-label="Verified source facts">
      <div>
        <strong>Verified source facts · {facts.length}</strong>
        <div style={{fontSize: 12, opacity: .72, marginTop: 3}}>Read-only snapshot from the canonical Clash Index ledger when this draft was created.</div>
      </div>
      <div style={{display: 'grid', gap: 8}}>
        {facts.map((fact) => (
          <article key={`${fact.ledgerId}:${fact.playerId}`} style={{borderTop: '1px solid rgba(127,127,127,.2)', paddingTop: 8}}>
            <div style={{display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap'}}>
              <strong>{factEntity(fact)}{factOpponent(fact) ? ` vs ${factOpponent(fact)}` : ''}</strong>
              <span style={{fontWeight: 800}}>{Math.round(fact.expectedScore * 100)}% expected · {signed(fact.totalDelta)} CI</span>
            </div>
            <small style={{opacity: .72}}>
              Fact #{fact.ledgerId} · {fact.eventLabel || `Event ${fact.eventOrder}`} · {formatFactFormat(fact.format)} · {formatFactSide(fact.side)} · {formatFactOutcome(fact.outcome)}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

async function fetchStoryList(): Promise<Story[]> {
  const response = await fetch('/api/stories', {cache: 'no-store'});
  const payload = await response.json() as {stories?: Story[]; error?: string};
  if (!response.ok) throw new Error(payload.error || 'Stories could not load.');
  return payload.stories ?? [];
}

function storyToDraft(story: Story): StoryDraft {
  return {
    slug: story.slug,
    title: story.title,
    category: story.category,
    publishedDate: storyDateInputValue(story.publishedAt),
    body: story.body.join('\n\n'),
    links: (story.links ?? []).map((link) => `${link.label} | ${link.url}`).join('\n'),
    image: story.image,
    heroAssetId: story.heroAssetId ?? null,
    featured: story.featured === true,
    status: story.status,
  };
}

function draftToPayload(draft: StoryDraft, slug: string, status: StoryStatus) {
  return {
    slug,
    title: draft.title.trim(),
    category: draft.category.trim() || 'Announcement',
    publishedAt: draft.publishedDate ? `${draft.publishedDate}T12:00:00.000Z` : null,
    image: draft.image.trim() || 'hero',
    heroAssetId: draft.heroAssetId,
    body: splitBody(draft.body),
    links: parseLinks(draft.links),
    featured: draft.featured,
    status,
  };
}

function splitBody(body: string): string[] {
  return body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
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

function factEntity(fact: StorySourceFactSnapshot): string {
  if (!fact.partnerName) return fact.playerName;
  return [fact.playerName, fact.partnerName].sort().join(' + ');
}

function factOpponent(fact: StorySourceFactSnapshot): string {
  return [fact.opponentOneName, fact.opponentTwoName]
    .filter((value): value is string => Boolean(value))
    .sort()
    .join(' + ');
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`;
}

function formatFactFormat(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('double')) return 'Doubles';
  if (normalized.includes('single')) return 'Singles';
  return value;
}

function formatFactSide(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'away') return 'Road';
  if (normalized === 'home') return 'Home';
  return value;
}

function formatFactOutcome(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'w' || normalized === 'win') return 'Win';
  if (normalized === 'l' || normalized === 'loss') return 'Loss';
  if (normalized === 't' || normalized === 'tie') return 'Tie';
  return value;
}

function isImageUrl(image: string): boolean {
  return image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/');
}