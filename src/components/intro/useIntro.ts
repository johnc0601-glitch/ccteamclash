'use client';

import {useCallback, useLayoutEffect, useRef, useState} from 'react';
import {startIntroAudio} from './AudioManager';
import {
  INTRO_COOKIE_NAME,
  INTRO_SESSION_KEY,
  INTRO_TIMING,
  type IntroPhase,
} from './intro.config';
import {decideIntroPlayback, type IntroQueryOverride} from './introDecision';

type UseIntroOptions = {
  hasLoginMarker: boolean;
  queryOverride: IntroQueryOverride;
};

type UseIntroResult = {
  awaitingAudioGesture: boolean;
  beginIntro: () => void;
  isMounted: boolean;
  phase: IntroPhase;
  reducedMotion: boolean;
  finish: () => void;
};

export function useIntro({hasLoginMarker, queryOverride}: UseIntroOptions): UseIntroResult {
  const initiallyRequested = queryOverride === 'play' || (queryOverride !== 'skip' && hasLoginMarker);
  const [isMounted, setIsMounted] = useState(initiallyRequested);
  const [awaitingAudioGesture, setAwaitingAudioGesture] = useState(initiallyRequested);
  const [phase, setPhase] = useState<IntroPhase>('idle');
  const [reducedMotion, setReducedMotion] = useState(false);
  const timers = useRef<number[]>([]);
  const animationFrame = useRef<number | null>(null);
  const stopAudio = useRef<() => void>(() => undefined);
  const reducedMotionPreference = useRef(false);

  const finish = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
    stopAudio.current();
    stopAudio.current = () => undefined;
    setIsMounted(false);
  }, []);

  const beginIntro = useCallback(() => {
    const prefersReducedMotion = reducedMotionPreference.current;

    window.sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    setAwaitingAudioGesture(false);
    stopAudio.current = startIntroAudio({reducedMotion: prefersReducedMotion});

    if (prefersReducedMotion) {
      setReducedMotion(true);
      setPhase('logo');
      timers.current.push(window.setTimeout(finish, INTRO_TIMING.reducedMotionHoldMs));
      return;
    }

    animationFrame.current = window.requestAnimationFrame(() => setPhase('dawn'));

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
  }, [finish]);

  useLayoutEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionPreference.current = motionQuery.matches;
    const hasPlayedThisSession = window.sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
    const shouldPlay = decideIntroPlayback({
      queryOverride,
      hasLoginMarker,
      hasPlayedThisSession,
    });

    document.cookie = `${INTRO_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;

    if (!shouldPlay) {
      animationFrame.current = window.requestAnimationFrame(() => {
        setAwaitingAudioGesture(false);
        setIsMounted(false);
      });
      return () => {
        if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      };
    }

    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      stopAudio.current();
      stopAudio.current = () => undefined;
    };
  }, [finish, hasLoginMarker, queryOverride]);

  return {awaitingAudioGesture, beginIntro, isMounted, phase, reducedMotion, finish};
}
