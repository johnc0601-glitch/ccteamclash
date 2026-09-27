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

type MatchdayIntroPhase = 'start' | 'welcome' | 'poster' | 'loaded' | 'exit';

type MatchdayIntroStyle = CSSProperties & {
  '--intro-away': string;
  '--intro-away-secondary': string;
  '--intro-home': string;
  '--intro-home-secondary': string;
};

const TIMING = {
  welcomeAtMs: 180,
  posterAtMs: 1220,
  loadedAtMs: 2700,
  exitAtMs: 3900,
  finishAtMs: 4500,
  reducedExitAtMs: 1150,
  reducedFinishAtMs: 1350,
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
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    if (!play) {
      setIsMounted(false);
      return;
    }

    setIsMounted(true);
    setPhase('start');
    setPosterFailed(false);

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
      setPhase('loaded');
      timers.push(
        window.setTimeout(() => setPhase('exit'), TIMING.reducedExitAtMs),
        window.setTimeout(finish, TIMING.reducedFinishAtMs),
      );
    } else {
      timers.push(
        window.setTimeout(() => setPhase('welcome'), TIMING.welcomeAtMs),
        window.setTimeout(() => setPhase('poster'), TIMING.posterAtMs),
        window.setTimeout(() => setPhase('loaded'), TIMING.loadedAtMs),
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
    '--intro-away-secondary': awayTeam.secondaryColor,
    '--intro-home': homeTeam.primaryColor,
    '--intro-home-secondary': homeTeam.secondaryColor,
  };

  const posterSrc = resolveMatchdayPoster(matchId, awayTeam, homeTeam);

  return (
    <div
      className={styles.overlay}
      data-phase={phase}
      data-match-id={matchId}
      style={style}
      aria-hidden="true"
    >
      <div className={styles.atmosphere} />
      <div className={styles.grain} />

      <div className={styles.brand}>
        <img src="/branding/team-clash-logo.svg" alt="" className={styles.brandLogo} />
        <span>Team Clash</span>
      </div>

      <div className={styles.stage}>
        <div className={styles.welcome}>
          <span>Welcome to</span>
          <strong>Match Day!</strong>
        </div>

        <div className={styles.posterFrame}>
          {posterSrc && !posterFailed ? (
            <img
              src={posterSrc}
              alt=""
              className={styles.poster}
              fetchPriority="high"
              onError={() => setPosterFailed(true)}
            />
          ) : (
            <FallbackMatchPoster awayTeam={awayTeam} homeTeam={homeTeam} />
          )}
          <div className={styles.posterVignette} />
        </div>

        <div className={styles.loaded}>
          <span className={styles.loadedLine} />
          <strong>Final rosters loaded</strong>
          <span className={styles.loadedLine} />
        </div>
      </div>
    </div>
  );
}

function resolveMatchdayPoster(
  matchId: string,
  awayTeam: MatchdayIntroTeam,
  homeTeam: MatchdayIntroTeam,
): string | null {
  const awayName = awayTeam.name.trim().toLowerCase();
  const homeName = homeTeam.name.trim().toLowerCase();

  if (
    matchId === 'kb-at-dark-knights-2026-r1'
    || (awayName === 'kb' && homeName === 'dark knights')
  ) {
    return KB_DARK_KNIGHTS_POSTER;
  }

  return null;
}

function FallbackMatchPoster({
  awayTeam,
  homeTeam,
}: {
  awayTeam: MatchdayIntroTeam;
  homeTeam: MatchdayIntroTeam;
}) {
  return (
    <div className={styles.fallbackPoster}>
      <div className={styles.fallbackSide}>
        <span>{awayTeam.shortName || initials(awayTeam.name)}</span>
        <small>{awayTeam.name}</small>
      </div>
      <div className={styles.fallbackVs}>VS</div>
      <div className={styles.fallbackSide}>
        <span>{homeTeam.shortName || initials(homeTeam.name)}</span>
        <small>{homeTeam.name}</small>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}
