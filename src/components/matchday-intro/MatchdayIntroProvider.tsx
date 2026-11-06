'use client';

import {createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {isMatchdayToday, findMatchdayIntro, selectIntroImage, MATCHDAY_INTRO_TIMING, type MatchdayIntroArt} from './matchdayIntro.config';
import styles from './MatchdayIntro.module.css';

type Run = {id: number; from: string; href: string; slug: string; art: MatchdayIntroArt; src: string; reduced: boolean};
const IntroContext = createContext<(href: string, matchDate?: string | null) => void>(() => {});
export const useMatchdayIntro = () => useContext(IntroContext);

// Only explicit Link.onNavigate events create a run. No storage, query flags or
// mount effects can replay it on refresh, back/forward, or server revalidation.
export function MatchdayIntroProvider({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const counter = useRef(0);
  const [run, setRun] = useState<Run | null>(null);
  const start = useCallback((href: string, matchDate?: string | null) => {
    if (!isMatchdayToday(matchDate)) return;
    const entry = findMatchdayIntro(href);
    if (!entry || pathname === href || pathname === `/matches/${entry.slug}`) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const src = selectIntroImage(entry.art, isMobile);
    const preload = new window.Image();
    preload.src = src;
    setRun({id: ++counter.current, from: pathname, href, ...entry, src,
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches});
  }, [pathname]);
  const finish = useCallback(() => setRun(null), []);
  const visible = run && [run.from, run.href, `/matches/${run.slug}`].includes(pathname);
  // Discard interrupted runs permanently, so returning via history cannot revive one.
  if (run && !visible) setRun(null);

  return (
    <IntroContext.Provider value={start}>
      <div inert={visible ? true : undefined}>{children}</div>
      {visible ? <MatchdayIntro key={run.id} run={run} onFinish={finish} /> : null}
    </IntroContext.Provider>
  );
}

function MatchdayIntro({run, onFinish}: {run: Run; onFinish: () => void}) {
  const [src, setSrc] = useState(run.src);
  const pathname = usePathname();
  const [held, setHeld] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const ready = posterReady;
  const destinationReady = pathname === run.href || pathname === `/matches/${run.slug}`;
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    skip.current?.focus({preventScroll: true});
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onFinish(); };
    const leave = () => onFinish();
    const visibility = () => { if (document.hidden) onFinish(); };
    window.addEventListener('keydown', escape);
    window.addEventListener('popstate', leave);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', escape);
      window.removeEventListener('popstate', leave);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [onFinish]);

  // Count the full hold only after the actual poster has loaded.
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setHeld(true), MATCHDAY_INTRO_TIMING.holdMs);
    return () => window.clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (!held || !destinationReady) return;
    const frame = window.requestAnimationFrame(() => setExiting(true));
    const timer = window.setTimeout(onFinish,
      run.reduced ? MATCHDAY_INTRO_TIMING.reducedMs : MATCHDAY_INTRO_TIMING.zoomMs);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [held, destinationReady, onFinish, run.reduced]);

  useEffect(() => {
    const deadline = window.setTimeout(onFinish, MATCHDAY_INTRO_TIMING.loadTimeoutMs);
    return () => window.clearTimeout(deadline);
  }, [onFinish]);

  return (
    <div className={styles.intro} data-matchday-intro data-reduced={run.reduced} data-ready={ready} data-exiting={exiting}
      style={{'--intro-zoom-ms': `${run.reduced ? MATCHDAY_INTRO_TIMING.reducedMs : MATCHDAY_INTRO_TIMING.zoomMs}ms`} as CSSProperties}
      role="dialog" aria-modal="true" aria-label={`Welcome to Matchday: ${run.art.label}`}>
      <div className={styles.poster} data-has-mobile={src === run.art.mobile ? 'true' : 'false'}>
        {/* Native img shares the exact preloaded URL and supports optional art direction. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={run.art.label} fetchPriority="high" loading="eager"
          onLoad={() => setPosterReady(true)}
          onError={() => {
            if (src !== run.art.desktop) setSrc(run.art.desktop);
            else onFinish();
          }} />
      </div>
      <button ref={skip} type="button" className={styles.skip} onClick={onFinish}>Skip intro</button>
    </div>
  );
}
