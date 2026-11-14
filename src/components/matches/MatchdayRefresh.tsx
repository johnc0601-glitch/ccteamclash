'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Refresh open matchday pages for publication and the Eastern 6 PM transition. */
export function MatchdayRefresh({date}: {date: string | null}) {
  const router = useRouter();
  useEffect(() => {
    if (!date) return;
    const refresh = () => {
      const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
      if (document.visibilityState === 'visible' && today >= date) router.refresh();
    };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh);};
  }, [date, router]);
  return null;
}
