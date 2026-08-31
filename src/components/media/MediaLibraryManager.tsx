'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import type {MediaAsset} from '@/services/media/MediaLibraryService';
import styles from './MediaLibraryManager.module.css';

type Filter = 'all' | 'public' | 'library';

export function MediaLibraryManager() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [publishUploads, setPublishUploads] = useState(false);
  const [takenAt, setTakenAt] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('Loading photo library...');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    reloadAssets()
      .catch((error) => setStatus(error instanceof Error ? error.message : 'Photo library could not load.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredAssets = useMemo(() => assets.filter((asset) => {
    if (filter === 'public') return asset.galleryVisible;
    if (filter === 'library') return !asset.galleryVisible;
    return true;
  }), [assets, filter]);

  async function reloadAssets() {
    const response = await fetch('/api/media-assets', {cache: 'no-store'});
    const payload = await response.json() as {assets?: MediaAsset[]; error?: string};
    if (!response.ok) throw new Error(payload.error || 'Photo library could not load.');
    setAssets(payload.assets ?? []);
    setStatus((payload.assets ?? []).length ? `${payload.assets!.length} photos in the library.` : 'Photo library is empty.');
  }

  async function uploadSelected() {
    if (!files.length || uploading) return;
    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        setStatus(`Uploading ${uploaded + 1} of ${files.length}...`);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('galleryVisible', publishUploads ? 'true' : 'false');
        if (takenAt) formData.append('takenAt', takenAt);

        const response = await fetch('/api/media-assets', {method: 'POST', body: formData});
        const payload = await response.json() as {id?: string; error?: string};
        if (!response.ok || !payload.id) throw new Error(payload.error || `${file.name} could not upload.`);
        uploaded += 1;
      }

      setFiles([]);
      if (fileRef.current) fileRef.current.value = '';
      await reloadAssets();
      setStatus(`${uploaded} photo${uploaded === 1 ? '' : 's'} uploaded${publishUploads ? ' and published to the gallery' : ''}.`);
    } catch (error) {
      await reloadAssets().catch(() => undefined);
      setStatus(error instanceof Error ? error.message : 'Photo upload stopped.');
    } finally {
      setUploading(false);
    }
  }

  function updateAssetInList(asset: MediaAsset) {
    setAssets((current) => current.map((item) => item.id === asset.id ? asset : item));
  }

  return (
    <section className={styles.library}>
      <div className={styles.toolbar}>
        <div>
          <h2>Photo Library</h2>
          <p>Reusable league photos for stories and the public gallery.</p>
        </div>
        <div className={styles.uploadControls}>
          <label className={styles.fileButton} aria-disabled={uploading}>
            {files.length ? `${files.length} selected` : 'Choose photos'}
            <input
              ref={fileRef}
              type="file"
              multiple
              disabled={uploading}
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </label>
          <input type="date" aria-label="Date photos were taken" value={takenAt} disabled={uploading} onChange={(event) => setTakenAt(event.target.value)} />
          <label className={styles.check}>
            <input type="checkbox" checked={publishUploads} disabled={uploading} onChange={(event) => setPublishUploads(event.target.checked)} />
            Public gallery
          </label>
          <button className={styles.actionButton} type="button" disabled={!files.length || uploading} onClick={uploadSelected}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      <p className={styles.status}>{status}</p>

      <div className={styles.filters} aria-label="Photo library filters">
        <button type="button" data-active={filter === 'all'} onClick={() => setFilter('all')}>All ({assets.length})</button>
        <button type="button" data-active={filter === 'public'} onClick={() => setFilter('public')}>Public ({assets.filter((asset) => asset.galleryVisible).length})</button>
        <button type="button" data-active={filter === 'library'} onClick={() => setFilter('library')}>Library only ({assets.filter((asset) => !asset.galleryVisible).length})</button>
      </div>

      {loading ? <div className={styles.empty}>Loading photos...</div> : null}
      {!loading && filteredAssets.length === 0 ? <div className={styles.empty}>No photos in this view.</div> : null}

      <div className={styles.grid}>
        {filteredAssets.map((asset) => (
          <MediaAssetCard key={asset.id} asset={asset} onSaved={updateAssetInList} />
        ))}
      </div>
    </section>
  );
}

function MediaAssetCard({asset, onSaved}: {asset: MediaAsset; onSaved: (asset: MediaAsset) => void}) {
  const [caption, setCaption] = useState(asset.caption);
  const [altText, setAltText] = useState(asset.altText);
  const [galleryVisible, setGalleryVisible] = useState(asset.galleryVisible);
  const [takenAt, setTakenAt] = useState(dateInputValue(asset.takenAt));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setCaption(asset.caption);
    setAltText(asset.altText);
    setGalleryVisible(asset.galleryVisible);
    setTakenAt(dateInputValue(asset.takenAt));
  }, [asset]);

  async function save() {
    setSaving(true);
    setMessage('Saving...');
    try {
      const response = await fetch(`/api/media-assets/${asset.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({caption, altText, galleryVisible, takenAt}),
      });
      const payload = await response.json() as {asset?: MediaAsset; error?: string};
      if (!response.ok || !payload.asset) throw new Error(payload.error || 'Photo details could not save.');
      onSaved(payload.asset);
      setMessage(payload.asset.galleryVisible ? 'Saved · Public gallery' : 'Saved · Library only');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Photo details could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={styles.card}>
      <img className={styles.photo} src={asset.url} alt={altText || caption || 'CC Team Clash photo'} loading="lazy" />
      <div className={styles.cardBody}>
        <label>
          Caption
          <input type="text" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Optional caption" />
        </label>
        <label>
          Alt text
          <input type="text" value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the photo" />
        </label>
        <label>
          Date taken
          <input type="date" value={takenAt} onChange={(event) => setTakenAt(event.target.value)} />
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={galleryVisible} onChange={(event) => setGalleryVisible(event.target.checked)} />
          Show in public gallery
        </label>
        <button className={styles.secondaryButton} type="button" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save photo'}</button>
        {message ? <div className={styles.cardMeta}>{message}</div> : null}
        <div className={styles.cardMeta}>{asset.originalFilename || asset.storagePath}</div>
      </div>
    </article>
  );
}

function dateInputValue(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
