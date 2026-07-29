import Image from 'next/image';
import type {CSSProperties} from 'react';
import {INTRO_ASSETS, INTRO_MOTTO, INTRO_TIMING} from './intro.config';
import styles from './Intro.module.css';

type LogoStyle = CSSProperties & {
  '--logo-duration': string;
  '--motto-delay': string;
  '--motto-duration': string;
};

export function LogoScene() {
  const style: LogoStyle = {
    '--logo-duration': `${INTRO_TIMING.logoMs}ms`,
    '--motto-delay': `${INTRO_TIMING.mottoDelayMs}ms`,
    '--motto-duration': `${INTRO_TIMING.mottoFadeMs}ms`,
  };

  return (
    <section className={styles.logoScene} style={style} aria-label="Welcome to Team Clash">
      <div className={styles.logoLockup}>
        <p className={styles.welcome}>Welcome to</p>
        <Image
          alt="Coastal Carolina Team Clash"
          className={styles.logo}
          height={1280}
          preload
          src={INTRO_ASSETS.logo}
          unoptimized
          width={1258}
        />
        <p className={styles.motto}>{INTRO_MOTTO}</p>
      </div>
    </section>
  );
}
