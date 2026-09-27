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

type MatchdayIntroPhase = 'start' | 'away' | 'vs' | 'home' | 'hold' | 'exit';

type MatchdayIntroStyle = CSSProperties & {
  '--intro-away': string;
  '--intro-away-secondary': string;
  '--intro-home': string;
  '--intro-home-secondary': string;
};

const TIMING = {
  awayAtMs: 180,
  vsAtMs: 820,
  homeAtMs: 1370,
  holdAtMs: 1920,
  exitAtMs: 2820,
  finishAtMs: 3380,
  reducedExitAtMs: 850,
  reducedFinishAtMs: 1050,
} as const;

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
      setPhase('hold');
      timers.push(
        window.setTimeout(() => setPhase('exit'), TIMING.reducedExitAtMs),
        window.setTimeout(finish, TIMING.reducedFinishAtMs),
      );
    } else {
      timers.push(
        window.setTimeout(() => setPhase('away'), TIMING.awayAtMs),
        window.setTimeout(() => setPhase('vs'), TIMING.vsAtMs),
        window.setTimeout(() => setPhase('home'), TIMING.homeAtMs),
        window.setTimeout(() => setPhase('hold'), TIMING.holdAtMs),
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
        <span>Matchday</span>
      </div>

      <div className={styles.matchup}>
        <TeamMark team={awayTeam} side="away" />
        <div className={styles.impact}>
          <span>VS</span>
        </div>
        <TeamMark team={homeTeam} side="home" />
      </div>
    </div>
  );
}

function TeamMark({team, side}: {team: MatchdayIntroTeam; side: 'away' | 'home'}) {
  const className = side === 'away'
    ? `${styles.team} ${styles.away}`
    : `${styles.team} ${styles.home}`;

  return (
    <div className={className}>
      <div className={styles.logoStage}>
        {team.logo ? (
          <img src={team.logo} alt="" className={styles.teamLogo} />
        ) : (
          <div className={styles.logoFallback}>{team.shortName || initials(team.name)}</div>
        )}
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
