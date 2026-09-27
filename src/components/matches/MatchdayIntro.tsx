'use client';

import {useEffect, useState, type CSSProperties} from 'react';
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

type MatchdayIntroStyle = CSSProperties & {
  '--intro-away': string;
  '--intro-home': string;
};

const TIMING = {
  welcomeAtMs: 220,
  posterAtMs: 1350,
  finalizedAtMs: 2750,
  exitAtMs: 4050,
  finishAtMs: 4650,
  reducedExitAtMs: 1200,
  reducedFinishAtMs: 1400,
} as const;

const KB_DARK_KNIGHTS_POSTER = '/matchday-intros/kb-vs-dark-knights-2026-r1.webp';

export function MatchdayIntro({
  matchId,
  play,
  awayTeam,
  homeTeam,
}: MatchdayIntroProps) {
  const [isMounted, setIsMounted] = useState(play);
  const [phase, setPhase] = useState<MatchdayIntroPhase>('start');

  useEffect(() => {
    if (!play) {
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
  }, [matchId, play]);

  if (!isMounted) return null;

  const style: MatchdayIntroStyle = {
    '--intro-away': awayTeam.primaryColor,
    '--intro-home': homeTeam.primaryColor,
  };

  return (
    <div
      className={styles.overlay}
      data-phase={phase}
      data-match-id={matchId}
      style={style}
      aria-hidden="true"
    >
      <div className={styles.welcome}>Welcome to Matchday!</div>

      <div className={styles.posterStage}>
        <img
          src={resolveMatchdayPoster(matchId, awayTeam, homeTeam)}
          alt=""
          className={styles.poster}
          fetchPriority="high"
        />
        <div className={styles.posterShade} />
      </div>

      <div className={styles.finalized}>Roster finalized!</div>
    </div>
  );
}

function resolveMatchdayPoster(
  matchId: string,
  awayTeam: MatchdayIntroTeam,
  homeTeam: MatchdayIntroTeam,
): string {
  const awayName = awayTeam.name.trim().toLowerCase();
  const homeName = homeTeam.name.trim().toLowerCase();

  if (
    matchId === 'kb-at-dark-knights-2026-r1'
    || (awayName === 'kb' && homeName === 'dark knights')
  ) {
    return KB_DARK_KNIGHTS_POSTER;
  }

  return KB_DARK_KNIGHTS_POSTER;
}
