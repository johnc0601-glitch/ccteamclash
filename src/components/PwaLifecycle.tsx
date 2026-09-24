'use client';

import {useEffect} from 'react';

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

export function PwaLifecycle() {
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(display-mode: standalone)');

    const syncDisplayMode = () => {
      root.dataset.displayMode = isStandaloneDisplay() ? 'standalone' : 'browser';
    };

    syncDisplayMode();
    mediaQuery.addEventListener?.('change', syncDisplayMode);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', {scope: '/', updateViaCache: 'none'})
        .catch((error) => {
          console.error('Team Clash service worker registration failed.', error);
        });
    }

    return () => {
      mediaQuery.removeEventListener?.('change', syncDisplayMode);
    };
  }, []);

  return null;
}
