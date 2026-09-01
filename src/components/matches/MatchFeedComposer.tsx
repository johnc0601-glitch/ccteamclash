'use client';

import {useEffect, useRef, useState} from 'react';
import {useFormStatus} from 'react-dom';
import {createMatchFeedPost} from '@/app/matches/[id]/feedActions';
import styles from './MatchFeedComposer.module.css';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

type MatchFeedComposerProps = {
  matchId: string;
};

export function MatchFeedComposer({matchId}: MatchFeedComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectPhoto(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFailed(false);
    setPhotoError('');
    if (!file) {
      setPreviewUrl(null);
      setFileName('');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPreviewUrl(null);
      setFileName('');
      setPhotoError('Photo must be 8 MB or smaller.');
      return;
    }
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearPhoto() {
    if (fileInputRef.current) fileInputRef.current.value = '';
    selectPhoto(null);
  }

  return (
    <form action={createMatchFeedPost} className={styles.composer}>
      <input type="hidden" name="matchId" value={matchId} />
      <textarea name="body" maxLength={3000} placeholder="What’s happening at this match?" aria-label="New match post" />
      {photoError ? <div className={styles.previewFallback} role="alert">{photoError}</div> : null}
      {previewUrl ? (
        <div className={styles.composerPreview}>
          {!previewFailed ? (
            <img src={previewUrl} alt="Selected Matchday upload preview" onError={() => setPreviewFailed(true)} />
          ) : (
            <div className={styles.previewFallback}>Photo selected · preview unavailable on this device</div>
          )}
          <div className={styles.previewMeta} aria-live="polite">
            <span title={fileName}>{fileName}</span>
            <button type="button" onClick={clearPhoto}>Remove photo</button>
          </div>
        </div>
      ) : null}
      <div className={styles.composerActions}>
        <input
          ref={fileInputRef}
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          onChange={(event) => selectPhoto(event.currentTarget.files?.[0] ?? null)}
        />
        <PostButton />
      </div>
    </form>
  );
}

function PostButton() {
  const {pending} = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Posting…' : 'Post'}</button>;
}
