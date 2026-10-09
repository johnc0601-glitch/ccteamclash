'use client';

import {useRouter} from 'next/navigation';
import {useEffect} from 'react';

/**
 * Refresh the existing server-rendered cards while scores are pending on
 * Matchday. The homepage result query is limited to the four visible matches,
 * and the timer pauses when the tab is hidden.
 */
export function HomeScoreAutoRefresh({enabled}: {enabled: boolean}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [enabled, router]);

  return null;
}
