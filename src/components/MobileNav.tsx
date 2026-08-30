'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useRef} from 'react';

const FACEBOOK_GROUP_URL = 'https://facebook.com/groups/780013754161635/';

type MobileNavProps = {
  canOpenOffice: boolean;
  canOpenCaptain: boolean;
};

export function MobileNav({canOpenOffice, canOpenCaptain}: MobileNavProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <details ref={detailsRef} className="mobile-nav">
      <summary aria-label="Menu"><span aria-hidden="true">☰</span></summary>
      <nav>
        {(canOpenOffice || canOpenCaptain) ? (
          <div className="mobile-nav-group mobile-nav-tools">
            <span>Tools</span>
            {canOpenOffice ? <Link href="/admin" onClick={closeMenu}>Create post</Link> : null}
            {canOpenOffice ? <Link href="/office" onClick={closeMenu}>Office</Link> : null}
            {canOpenCaptain ? <Link href="/captain" onClick={closeMenu}>Captain</Link> : null}
          </div>
        ) : null}
        <div className="mobile-nav-group">
          <span>Season</span>
          <Link href="/schedule" onClick={closeMenu}>Schedule</Link>
          <Link href="/standings" onClick={closeMenu}>Standings</Link>
          <Link href="/stats" onClick={closeMenu}>Stats</Link>
        </div>
        <div className="mobile-nav-group">
          <span>League</span>
          <Link href="/teams" onClick={closeMenu}>Teams</Link>
          <Link href="/players" onClick={closeMenu}>Players</Link>
          <Link href="/stories" onClick={closeMenu}>Stories</Link>
          <Link href="/courses" onClick={closeMenu}>Courses</Link>
          <Link href="/history" onClick={closeMenu}>History</Link>
        </div>
        <div className="mobile-nav-group">
          <span>Community</span>
          <div style={{padding: '10px 8px'}}>
            <a
              href={FACEBOOK_GROUP_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Team Clash Facebook group"
              title="Facebook group"
              onClick={closeMenu}
              style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0}}
            >
              <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="12" fill="#1877F2" />
                <path
                  fill="#fff"
                  d="M13.7 8.3V6.9c0-.7.5-.9.9-.9h2.3V2.2L13.7 2C10.5 2 9.4 3.9 9.4 6.5v1.8H7v4.2h2.4V22h4.3v-9.5h3.1l.5-4.2h-3.6z"
                />
              </svg>
            </a>
          </div>
        </div>
      </nav>
    </details>
  );
}
