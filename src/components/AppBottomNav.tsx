'use client';

import Link from 'next/link';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {useHeaderAccess} from '@/components/HeaderAccessProvider';
import styles from './AppBottomNav.module.css';

type Tab = {
  label: string;
  href: string;
  active: boolean;
  icon: 'home' | 'team' | 'matchday' | 'league' | 'me';
};

export function AppBottomNav() {
  const pathname = usePathname();
  const {activeTeamId, clubhouseHasUnread} = useHeaderAccess();
  const teamHref = activeTeamId ? `/teams/${encodeURIComponent(activeTeamId)}` : '/teams';

  useEffect(() => {
    if (!window.matchMedia('(display-mode: standalone)').matches) return;

    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (contents?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };

    if (clubhouseHasUnread) {
      void badgeNavigator.setAppBadge?.(1).catch(() => undefined);
    } else {
      void badgeNavigator.clearAppBadge?.().catch(() => undefined);
    }
  }, [clubhouseHasUnread]);

  const tabs: Tab[] = [
    {label: 'Home', href: '/', active: pathname === '/', icon: 'home'},
    {
      label: 'Team',
      href: teamHref,
      active: pathname === '/clubhouse' || pathname.startsWith('/captain') || (activeTeamId ? pathname === teamHref : pathname === '/teams'),
      icon: 'team',
    },
    {label: 'Matchday', href: '/matchday', active: pathname === '/matchday' || pathname.startsWith('/matches/'), icon: 'matchday'},
    {
      label: 'League',
      href: '/league',
      active: pathname === '/league' || ['/standings', '/stats', '/schedule', '/stories', '/courses', '/history', '/playoffs'].some((route) => pathname === route || pathname.startsWith(`${route}/`)),
      icon: 'league',
    },
    {label: 'Me', href: '/account', active: pathname === '/account' || pathname.startsWith('/account/') || pathname.startsWith('/auth/'), icon: 'me'},
  ];

  return (
    <>
      <nav className={styles.nav} aria-label="Team Clash app navigation">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={tab.active ? styles.active : undefined}
            aria-current={tab.active ? 'page' : undefined}
            data-tab={tab.icon}
          >
            <span className={styles.iconWrap}>
              <TabIcon name={tab.icon} />
              {tab.icon === 'team' && clubhouseHasUnread ? <i className={styles.unreadDot} aria-label="New Clubhouse activity" /> : null}
            </span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
      <div className={styles.spacer} aria-hidden="true" />
    </>
  );
}

function TabIcon({name}: {name: Tab['icon']}) {
  if (name === 'home') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.2 12 4l9 7.2v8.3H14v-5h-4v5H3z"/></svg>;
  if (name === 'team') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="8" r="2.5"/><path d="M2.5 19c.7-3.3 2.5-5 5.5-5s4.8 1.7 5.5 5M13 14.5c1-.8 2.1-1.2 3.5-1.2 2.7 0 4.3 1.5 5 4.5"/></svg>;
  if (name === 'matchday') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 4 10 16M17 4 7 20M5 7h14M5 17h14"/></svg>;
  if (name === 'league') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7M3 20h18"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.3 3.2-6.5 7.5-6.5s6.8 2.2 7.5 6.5"/></svg>;
}
