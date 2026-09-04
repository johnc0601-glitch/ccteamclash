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
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (count <= 1) return;
    const track = trackRef.current;
    if (!track) return;

    const jumpWithoutSnap = (left: number) => {
      const previousSnapType = track.style.scrollSnapType;
      const previousScrollBehavior = track.style.scrollBehavior;
      track.style.scrollSnapType = 'none';
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = left;
      requestAnimationFrame(() => {
        track.style.scrollSnapType = previousSnapType;
        track.style.scrollBehavior = previousScrollBehavior;
      });
    };

    const positionAtMiddle = () => {
      const slides = Array.from(track.children) as HTMLElement[];
      const firstMiddle = slides[count];
      const firstLast = slides[count * 2];
      if (!firstMiddle || !firstLast) return;

      const groupWidth = firstLast.offsetLeft - firstMiddle.offsetLeft;
      groupWidthRef.current = groupWidth;
      const centered = firstMiddle.offsetLeft - (track.clientWidth - firstMiddle.offsetWidth) / 2;
      jumpWithoutSnap(centered);
    };

    const frame = requestAnimationFrame(positionAtMiddle);
    window.addEventListener('resize', positionAtMiddle);
    return () => {
      cancelAnimationFrame(frame);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      window.removeEventListener('resize', positionAtMiddle);
    };
  }, [count]);

  const normalizeLoopPosition = () => {
    if (count <= 1 || jumpingRef.current) return;
    const track = trackRef.current;
    const groupWidth = groupWidthRef.current;
    if (!track || !groupWidth) return;

    const slides = Array.from(track.children) as HTMLElement[];
    const previousLast = slides[count - 1];
    const middleFirst = slides[count];
    const middleLast = slides[count * 2 - 1];
    const nextFirst = slides[count * 2];
    if (!previousLast || !middleFirst || !middleLast || !nextFirst) return;

    const center = track.scrollLeft + track.clientWidth / 2;
    const previousLastCenter = previousLast.offsetLeft + previousLast.offsetWidth / 2;
    const middleFirstCenter = middleFirst.offsetLeft + middleFirst.offsetWidth / 2;
    const middleLastCenter = middleLast.offsetLeft + middleLast.offsetWidth / 2;
    const nextFirstCenter = nextFirst.offsetLeft + nextFirst.offsetWidth / 2;
    const leftBoundary = (previousLastCenter + middleFirstCenter) / 2;
    const rightBoundary = (middleLastCenter + nextFirstCenter) / 2;

    let correctedLeft: number | null = null;
    if (center < leftBoundary) correctedLeft = track.scrollLeft + groupWidth;
    if (center > rightBoundary) correctedLeft = track.scrollLeft - groupWidth;
    if (correctedLeft === null) return;

    jumpingRef.current = true;
    const previousSnapType = track.style.scrollSnapType;
    const previousScrollBehavior = track.style.scrollBehavior;
    track.style.scrollSnapType = 'none';
    track.style.scrollBehavior = 'auto';
    track.scrollLeft = correctedLeft;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.style.scrollSnapType = previousSnapType;
        track.style.scrollBehavior = previousScrollBehavior;
        jumpingRef.current = false;
      });
    });
  };

  const keepLooping = () => {
    if (count <= 1 || jumpingRef.current) return;
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      normalizeLoopPosition();
    }, 120);
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
