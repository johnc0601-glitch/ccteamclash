'use client';

import {useEffect} from 'react';
import {isAppPreviewHost, resolveAppPreviewState} from '@/components/appPreviewState';

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export type TeamClashInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'; platform: string}>;
};

declare global {
  interface Window {
    __teamClashInstallPrompt?: TeamClashInstallPromptEvent;
  }
}

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

    const syncAppPreview = () => {
      const params = new URLSearchParams(window.location.search);
      const appSurface = process.env.NEXT_PUBLIC_APP_SURFACE === 'true'
        || window.location.hostname === 'app.ccteamclash.com';
      const state = resolveAppPreviewState({
        hostname: window.location.hostname,
        queryValue: params.get('appPreview'),
        persisted: window.localStorage.getItem('team-clash-app-preview') === '1',
        standalone: isStandaloneDisplay(),
        appSurface,
      });

      if (appSurface) {
        root.dataset.appSurface = 'true';
      } else {
        delete root.dataset.appSurface;
      }

      if (state.persisted) {
        window.localStorage.setItem('team-clash-app-preview', '1');
      } else {
        window.localStorage.removeItem('team-clash-app-preview');
      }

      if (state.enabled) {
        root.dataset.appPreview = 'true';
      } else {
        delete root.dataset.appPreview;
      }
    };

    syncDisplayMode();
    syncAppPreview();
    mediaQuery.addEventListener?.('change', syncDisplayMode);
    mediaQuery.addEventListener?.('change', syncAppPreview);

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as TeamClashInstallPromptEvent;
      promptEvent.preventDefault();
      window.__teamClashInstallPrompt = promptEvent;
      window.dispatchEvent(new Event('teamclash-install-ready'));
    };
    const onInstalled = () => {
      delete window.__teamClashInstallPrompt;
      syncDisplayMode();
      window.dispatchEvent(new Event('teamclash-installed'));
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const shouldRegisterServiceWorker = process.env.NEXT_PUBLIC_APP_SURFACE === 'true'
      || window.location.hostname === 'app.ccteamclash.com'
      || isAppPreviewHost(window.location.hostname)
      || isStandaloneDisplay();

    if (shouldRegisterServiceWorker && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', {scope: '/', updateViaCache: 'none'})
        .catch((error) => {
          console.error('Team Clash service worker registration failed.', error);
        });
    }

    return () => {
      mediaQuery.removeEventListener?.('change', syncDisplayMode);
      mediaQuery.removeEventListener?.('change', syncAppPreview);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return null;
}
