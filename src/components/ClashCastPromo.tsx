import styles from './ClashCastPromo.module.css';

const SPOTIFY_SHOW_URL =
  'https://open.spotify.com/show/14aM6HGYzqloa098b9FVlj?si=8INp9Nl0QYGHPulLtyor5A&utm_source=copy-link';

export function ClashCastPromo() {
  return (
    <a
      className={styles.card}
      href={SPOTIFY_SHOW_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Listen to Clash Cast on Spotify"
    >
      <span className={styles.topLine}>
        <span className={styles.name}>Clash Cast</span>
        <span className={styles.badge}>New episode</span>
      </span>
      <span className={styles.bottomLine}>
        <span className={styles.subtitle}>Team Clash Podcast</span>
        <span className={styles.listen}>
          Listen <span aria-hidden="true">›</span>
        </span>
      </span>
    </a>
  );
}
