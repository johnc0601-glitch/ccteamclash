'use client';

import type {CSSProperties} from 'react';
import {INTRO_ASSETS, INTRO_TIMING} from './intro.config';
import {LogoScene} from './LogoScene';
import {SceneImage} from './SceneImage';
import {useIntro} from './useIntro';
import styles from './Intro.module.css';

type IntroStyle = CSSProperties & {
  '--blackout-duration': string;
  '--exit-duration': string;
};

export function Intro() {
  const {isMounted, phase, reducedMotion} = useIntro();

  if (!isMounted) return null;

  const style: IntroStyle = {
    '--blackout-duration': `${INTRO_TIMING.blackoutMs}ms`,
    '--exit-duration': `${INTRO_TIMING.homepageCrossfadeMs}ms`,
  };

  return (
    <div
      className={styles.intro}
      data-phase={phase}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={style}
      role="presentation"
    >
      <SceneImage
        alt=""
        className={styles.dawn}
        durationMs={INTRO_TIMING.dawnMs}
        preload
        src={INTRO_ASSETS.dawn}
      />
      <SceneImage
        alt=""
        className={styles.disc}
        durationMs={INTRO_TIMING.discMs}
        preload
        src={INTRO_ASSETS.disc}
      />
      <LogoScene />
    </div>
  );
}
