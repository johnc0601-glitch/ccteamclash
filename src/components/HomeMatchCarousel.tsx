'use client';

import type {ReactNode} from 'react';
import {useRef} from 'react';
import styles from './HomeMatchCarousel.module.css';

type HomeMatchCarouselProps = {
  children: ReactNode;
  count: number;
};

export function HomeMatchCarousel({children, count}: HomeMatchCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.firstElementChild as HTMLElement | null;
    const distance = firstCard ? firstCard.getBoundingClientRect().width + 14 : track.clientWidth * 0.9;
    track.scrollBy({left: direction * distance, behavior: 'smooth'});
  };

  return (
    <div className={styles.carousel}>
      {count > 1 ? (
        <div className={styles.controls} aria-label="Match carousel controls">
          <button type="button" onClick={() => move(-1)} aria-label="Previous match">←</button>
          <span>Swipe matches</span>
          <button type="button" onClick={() => move(1)} aria-label="Next match">→</button>
        </div>
      ) : null}
      <div ref={trackRef} className={styles.track}>
        {children}
      </div>
    </div>
  );
}
