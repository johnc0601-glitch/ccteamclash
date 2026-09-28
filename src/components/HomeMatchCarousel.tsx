'use client';

import {Children, type ReactNode} from 'react';
import styles from './HomeMatchCarousel.module.css';

type HomeMatchCarouselProps = {
  children: ReactNode;
  count: number;
};

export function HomeMatchCarousel({children}: HomeMatchCarouselProps) {
  const items = Children.toArray(children);

  return (
    <div className={styles.carousel}>
      <div className={styles.track}>
        {items.map((item, index) => (
          <div className={styles.slide} key={index}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
