'use client';

import {useId, useRef, useState} from 'react';
import {SPOTIFY_SHOW_URL} from '@/components/ClashCastPromo';

const SPOTIFY_SHOW_ID = '14aM6HGYzqloa098b9FVlj';

type HeaderPodcastPlayerProps = {
  isNew: boolean;
  episodeTitle: string | null;
  episodeUrl: string | null;
};

/**
 * The Spotify iframe is not mounted until someone opens the player.
 * Closing the dialog unmounts it so audio stops and the next visit starts fresh.
 */
export function HeaderPodcastPlayer({isNew, episodeTitle, episodeUrl}: HeaderPodcastPlayerProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Only embed an ID from a well-formed Spotify episode URL, never arbitrary HTML.
  const episodeId = episodeUrl?.match(
    /^https:\/\/open\.spotify\.com\/episode\/([a-zA-Z0-9]+)(?:\?[^\s]*)?$/,
  )?.[1];
  const embedUrl = episodeId
    ? `https://open.spotify.com/embed/episode/${episodeId}?utm_source=generator`
    : `https://open.spotify.com/embed/show/${SPOTIFY_SHOW_ID}?utm_source=generator`;
  const spotifyUrl = episodeId ? episodeUrl! : SPOTIFY_SHOW_URL;
  const title = episodeTitle || 'Latest Clash Cast episode';

  function openPlayer() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setIsOpen(true);
  }

  function closePlayer() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="header-podcast-link header-podcast-trigger"
        onClick={openPlayer}
        aria-haspopup="dialog"
        aria-label={`Play ${episodeTitle ? `Clash Cast episode: ${episodeTitle}` : 'Clash Cast'} on this page`}
        title={episodeTitle ?? 'Listen to Clash Cast'}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
          <rect x="3" y="13" width="4" height="7" rx="1.5" />
          <rect x="17" y="13" width="4" height="7" rx="1.5" />
        </svg>
        <span className="header-podcast-copy">
          <span className="header-podcast-top">
            <span className="header-podcast-text">Clash Cast</span>
            {isNew ? <span className="header-podcast-new" aria-label="New episode">NEW</span> : null}
          </span>
          <span className="header-podcast-episode">{episodeTitle ?? 'Listen on Spotify'}</span>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="clash-cast-dialog"
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closePlayer();
        }}
        aria-labelledby={titleId}
      >
        <div className="clash-cast-dialog-content">
          <div className="clash-cast-dialog-heading">
            <div className="clash-cast-dialog-titles">
              <span>Coastal Carolina Team Clash</span>
              <h2 id={titleId}>Clash Cast</h2>
            </div>
            <button type="button" className="clash-cast-dialog-close" onClick={closePlayer} aria-label="Close podcast player">×</button>
          </div>
          <p className="clash-cast-dialog-episode-title">{title}</p>
          {isNew ? <span className="clash-cast-dialog-new">NEW EPISODE</span> : null}
          <div className="clash-cast-dialog-embed">
            {isOpen ? (
              <iframe
                title={`Spotify audio player: ${title}`}
                src={embedUrl}
                width="100%"
                height={episodeId ? '232' : '352'}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{border: 0, borderRadius: 12, display: 'block', width: '100%'}}
              />
            ) : null}
          </div>
          <div className="clash-cast-dialog-bottom">
            <span>Play the latest episode without leaving Team Clash.</span>
            <a href={spotifyUrl} target="_blank" rel="noopener noreferrer">
              Open in Spotify ↗
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
