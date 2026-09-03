'use client';

import {useCallback, useLayoutEffect, useRef, useState} from 'react';
import {
  INTRO_COOKIE_NAME,
  INTRO_SESSION_KEY,
  INTRO_TIMING,
  type IntroPhase,
} from './intro.config';
import {decideIntroPlayback, parseIntroQuery} from './introDecision';

type UseIntroResult = {
  isMounted: boolean;
  phase: IntroPhase;
  reducedMotion: boolean;
  finish: () => void;
};

export function useIntro(): UseIntroResult {
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>('idle');
  const [reducedMotion, setReducedMotion] = useState(false);
  const timers = useRef<number[]>([]);
  const animationFrame = useRef<number | null>(null);

  const finish = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
    setIsMounted(false);
  }, []);

  useLayoutEffect(() => {
    const queryOverride = parseIntroQuery(new URLSearchParams(window.location.search).get('intro') ?? undefined);
    const hasLoginMarker = document.cookie
      .split(';')
      .map((part) => part.trim())
      .some((part) => part === `${INTRO_COOKIE_NAME}=1`);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = motionQuery.matches;
    const hasPlayedThisSession = window.sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
    const shouldPlay = decideIntroPlayback({
      queryOverride,
      hasLoginMarker,
      hasPlayedThisSession,
    });

    document.cookie = `${INTRO_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;

    if (!shouldPlay) return;

    setIsMounted(true);
    window.sessionStorage.setItem(INTRO_SESSION_KEY, '1');

    if (prefersReducedMotion) {
      setReducedMotion(true);
      setPhase('logo');
      timers.current.push(window.setTimeout(finish, INTRO_TIMING.reducedMotionHoldMs));
      return () => {
        timers.current.forEach(window.clearTimeout);
        timers.current = [];
      };
    }

    setPhase('dawn');

    const discAt = INTRO_TIMING.dawnMs;
    const blackoutAt = discAt + INTRO_TIMING.discMs;
    const logoAt = blackoutAt + INTRO_TIMING.blackoutMs;
    const exitAt = logoAt + INTRO_TIMING.logoMs;
    const finishAt = exitAt + INTRO_TIMING.homepageCrossfadeMs;

    timers.current.push(
      window.setTimeout(() => setPhase('disc'), discAt),
      window.setTimeout(() => setPhase('blackout'), blackoutAt),
      window.setTimeout(() => setPhase('logo'), logoAt),
      window.setTimeout(() => setPhase('exit'), exitAt),
      window.setTimeout(finish, finishAt),
    );

    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    };
  }, [finish]);

  return {isMounted, phase, reducedMotion, finish};
}
