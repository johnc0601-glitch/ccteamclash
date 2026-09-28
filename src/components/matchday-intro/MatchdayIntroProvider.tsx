'use client';

import {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {findMatchdayIntro, selectIntroImage, MATCHDAY_WELCOME_ART, MATCHDAY_INTRO_TIMING, type MatchdayIntroArt} from './matchdayIntro.config';
import styles from './MatchdayIntro.module.css';

type Run = {id: number; from: string; href: string; slug: string; art: MatchdayIntroArt; src: string; reduced: boolean};
const IntroContext = createContext<(href: string) => void>(() => {});
export const useMatchdayIntro = () => useContext(IntroContext);

// Only explicit Link.onNavigate events create a run. No storage, query flags or
// mount effects can replay it on refresh, back/forward, or server revalidation.
export function MatchdayIntroProvider({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const counter = useRef(0);
  const [run, setRun] = useState<Run | null>(null);
  const start = useCallback((href: string) => {
    const entry = findMatchdayIntro(href);
    if (!entry || pathname === href || pathname === `/matches/${entry.slug}`) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const src = selectIntroImage(entry.art, isMobile);
    // Preload the matchup art. The welcome splash itself uses a responsive <picture>
    // so the browser selects the correct mobile/desktop source.
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
  const ready = useRef(false);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    skip.current?.focus({preventScroll: true});
    const timeout = window.setTimeout(onFinish,
      run.reduced ? MATCHDAY_INTRO_TIMING.reducedMs : MATCHDAY_INTRO_TIMING.durationMs);
    const imageDeadline = window.setTimeout(() => {
      if (!ready.current) onFinish();
    }, run.reduced ? MATCHDAY_INTRO_TIMING.reducedMs : MATCHDAY_INTRO_TIMING.revealMs);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onFinish(); };
    const leave = () => onFinish();
    const visibility = () => { if (document.hidden) onFinish(); };
    window.addEventListener('keydown', escape);
    window.addEventListener('popstate', leave);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(imageDeadline);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', escape);
      window.removeEventListener('popstate', leave);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [onFinish, run.reduced]);

  return (
    <div className={styles.intro} data-matchday-intro data-reduced={run.reduced}
      role="dialog" aria-modal="true" aria-label={`Welcome to Matchday: ${run.art.label}`}>
      <div className={styles.welcomeArt} aria-hidden="true">
        <picture>
          <source media="(max-width: 767px)" srcSet={MATCHDAY_WELCOME_ART.mobile} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MATCHDAY_WELCOME_ART.desktop} alt="" fetchPriority="high" loading="eager" />
        </picture>
      </div>
      <div className={styles.poster} data-has-mobile={run.art.mobile ? 'true' : 'false'}>
        {/* Native img shares the exact preloaded URL and supports optional art direction. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={run.art.label} fetchPriority="high" loading="eager"
          onLoad={() => { ready.current = true; }}
          onError={() => {
            if (src !== run.art.desktop) setSrc(run.art.desktop);
            else onFinish();
          }} />
      </div>
      <button ref={skip} type="button" className={styles.skip} onClick={onFinish}>Skip intro</button>
    </div>
  );
}
