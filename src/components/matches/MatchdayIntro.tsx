'use client';

import {useEffect, useState} from 'react';
import styles from './MatchdayIntro.module.css';

type MatchdayIntroTeam = {
  name: string;
  shortName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
};

type MatchdayIntroProps = {
  matchId: string;
  play: boolean;
  awayTeam: MatchdayIntroTeam;
  homeTeam: MatchdayIntroTeam;
};

type MatchdayIntroPhase = 'start' | 'welcome' | 'poster' | 'finalized' | 'exit';

type MatchdayIntroAssets = {
  desktopPoster: string;
  mobilePoster: string;
};

const TIMING = {
  welcomeAtMs: 220,
  posterAtMs: 1150,
  finalizedAtMs: 2850,
  exitAtMs: 4450,
  finishAtMs: 5200,
  reducedExitAtMs: 1350,
  reducedFinishAtMs: 1500,
} as const;

const WELCOME_MARK = '/matchday-intros/welcome-to-matchday.webp';
const ROSTERS_FINALIZED_MARK = '/matchday-intros/rosters-finalized.webp';

const KB_DARK_KNIGHTS_ASSETS: MatchdayIntroAssets = {
  desktopPoster: '/matchday-intros/kb-vs-dark-knights-2026-r1-desktop.webp',
  mobilePoster: '/matchday-intros/kb-vs-dark-knights-2026-r1-mobile.webp',
};

export function MatchdayIntro({
  matchId,
  play,
  awayTeam,
  homeTeam,
}: MatchdayIntroProps) {
  const introAssets = resolveMatchdayIntroAssets(matchId, awayTeam, homeTeam);
  const shouldPlay = play && Boolean(introAssets);
  const [isMounted, setIsMounted] = useState(shouldPlay);
  const [phase, setPhase] = useState<MatchdayIntroPhase>('start');

  useEffect(() => {
    if (!shouldPlay) {
      setIsMounted(false);
      return;
    }

    setIsMounted(true);
    setPhase('start');

    const timers: number[] = [];
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    let restored = false;

    const restoreScroll = () => {
      if (restored) return;
      restored = true;
      root.style.overflow = previousOverflow;
    };

    const finish = () => {
      restoreScroll();
      setIsMounted(false);
    };

    root.style.overflow = 'hidden';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setPhase('finalized');
      timers.push(
        window.setTimeout(() => setPhase('exit'), TIMING.reducedExitAtMs),
        window.setTimeout(finish, TIMING.reducedFinishAtMs),
      );
    } else {
      timers.push(
        window.setTimeout(() => setPhase('welcome'), TIMING.welcomeAtMs),
        window.setTimeout(() => setPhase('poster'), TIMING.posterAtMs),
        window.setTimeout(() => setPhase('finalized'), TIMING.finalizedAtMs),
        window.setTimeout(() => setPhase('exit'), TIMING.exitAtMs),
        window.setTimeout(finish, TIMING.finishAtMs),
      );
    }

    return () => {
      timers.forEach(window.clearTimeout);
      restoreScroll();
    };
  }, [matchId, shouldPlay]);

  if (!isMounted || !introAssets) return null;

  return (
    <div
      className={styles.overlay}
      data-phase={phase}
      data-match-id={matchId}
      aria-hidden="true"
    >
      <div className={styles.posterStage}>
        <picture className={styles.posterPicture}>
          <source media="(max-width: 700px)" srcSet={introAssets.mobilePoster} />
          <img
            src={introAssets.desktopPoster}
            alt=""
            className={styles.poster}
            fetchPriority="high"
          />
        </picture>
        <div className={styles.posterShade} />
      </div>

      <div className={styles.welcome}>
        <img src={WELCOME_MARK} alt="" className={styles.welcomeMark} fetchPriority="high" />
      </div>

      <div className={styles.finalized}>
        <img src={ROSTERS_FINALIZED_MARK} alt="" className={styles.finalizedMark} fetchPriority="high" />
      </div>
    </div>
  );
}

function resolveMatchdayIntroAssets(
  matchId: string,
  awayTeam: MatchdayIntroTeam,
  homeTeam: MatchdayIntroTeam,
): MatchdayIntroAssets | null {
  const awayNames = [awayTeam.name, awayTeam.shortName].map(normalizeTeamName);
  const homeNames = [homeTeam.name, homeTeam.shortName].map(normalizeTeamName);

  const isKureBeach = awayNames.some((name) => name === 'kb' || name === 'kure beach');
  const isDarkKnights = homeNames.some((name) => name === 'dk' || name === 'dark knights');

  if (matchId === 'kb-at-dark-knights-2026-r1' || (isKureBeach && isDarkKnights)) {
    return KB_DARK_KNIGHTS_ASSETS;
  }

  return null;
}

function normalizeTeamName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
