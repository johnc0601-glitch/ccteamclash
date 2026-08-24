'use client';

import {Children, type ReactNode, useEffect, useRef} from 'react';
import styles from './HomeMatchCarousel.module.css';

type HomeMatchCarouselProps = {
  children: ReactNode;
  count: number;
};

export function HomeMatchCarousel({children, count}: HomeMatchCarouselProps) {
  const items = Children.toArray(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupWidthRef = useRef(0);
  const jumpingRef = useRef(false);

  useEffect(() => {
    if (count <= 1) return;
    const track = trackRef.current;
    if (!track) return;

    const positionAtMiddle = () => {
      const slides = Array.from(track.children) as HTMLElement[];
      const firstMiddle = slides[count];
      const firstLast = slides[count * 2];
      if (!firstMiddle || !firstLast) return;

      const groupWidth = firstLast.offsetLeft - firstMiddle.offsetLeft;
      groupWidthRef.current = groupWidth;
      const centered = firstMiddle.offsetLeft - (track.clientWidth - firstMiddle.offsetWidth) / 2;
      track.scrollLeft = centered;
    };

    const frame = requestAnimationFrame(positionAtMiddle);
    window.addEventListener('resize', positionAtMiddle);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', positionAtMiddle);
    };
  }, [count]);

  const keepLooping = () => {
    if (count <= 1 || jumpingRef.current) return;
    const track = trackRef.current;
    const groupWidth = groupWidthRef.current;
    if (!track || !groupWidth) return;

    const slides = Array.from(track.children) as HTMLElement[];
    const middleStart = slides[count];
    const middleEnd = slides[count * 2];
    if (!middleStart || !middleEnd) return;

    const center = track.scrollLeft + track.clientWidth / 2;
    const startCenter = middleStart.offsetLeft + middleStart.offsetWidth / 2;
    const endCenter = middleEnd.offsetLeft + middleEnd.offsetWidth / 2;

    if (center < startCenter - groupWidth * 0.35) {
      jumpingRef.current = true;
      track.scrollLeft += groupWidth;
      requestAnimationFrame(() => { jumpingRef.current = false; });
    } else if (center > endCenter + groupWidth * 0.35) {
      jumpingRef.current = true;
      track.scrollLeft -= groupWidth;
      requestAnimationFrame(() => { jumpingRef.current = false; });
    }
  };

  return (
    <div className={styles.carousel}>
      <div className={styles.desktopTrack}>{children}</div>
      <div ref={trackRef} className={styles.mobileTrack} onScroll={keepLooping}>
        {count > 1
          ? [0, 1, 2].flatMap((cycle) => items.map((item, index) => (
              <div className={styles.slide} key={`${cycle}-${index}`} aria-hidden={cycle !== 1}>
                {item}
              </div>
            )))
          : items.map((item, index) => <div className={styles.slide} key={index}>{item}</div>)}
      </div>
    </div>
  );
}
