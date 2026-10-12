import Link from 'next/link';
import {DesktopRoleLinks} from '@/components/HeaderAccessProvider';
import {SPOTIFY_SHOW_URL} from '@/components/ClashCastPromo';
import {MobileAccountLink} from '@/components/MobileAccountLink';
import {MobileNav} from '@/components/MobileNav';
import {BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE, FOOTER_COPY} from '@/shared/constants';

const FACEBOOK_GROUP_URL = 'https://facebook.com/groups/780013754161635/';

function FacebookLink({size = 20}: {size?: number}) {
  return (
    <a
      href={FACEBOOK_GROUP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Team Clash Facebook group"
      title="Facebook group"
      style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0}}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path
          fill="#fff"
          d="M13.7 8.3V6.9c0-.7.5-.9.9-.9h2.3V2.2L13.7 2C10.5 2 9.4 3.9 9.4 6.5v1.8H7v4.2h2.4V22h4.3v-9.5h3.1l.5-4.2h-3.6z"
        />
      </svg>
    </a>
  );
}

function HeaderPodcastLink() {
  return (
    <a
      className="header-podcast-link"
      href={SPOTIFY_SHOW_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Listen to Clash Cast on Spotify"
      title="Listen to Clash Cast on Spotify"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
        <rect x="3" y="13" width="4" height="7" rx="1.5" />
        <rect x="17" y="13" width="4" height="7" rx="1.5" />
      </svg>
      <span className="header-podcast-text">Clash Cast</span>
    </a>
  );
}

export function SiteHeader() {
  return (
      <header className="site-header">
        <div className="primary-header">
          <div className="shell nav-wrap primary-nav-wrap">
            <Link href="/" className="brand">
              <span className="brand-mark">
                <img src={BRAND_LOGO} alt="Team Clash logo" width={48} height={48} />
              </span>
              <span><strong>{BRAND_NAME}</strong><small>{BRAND_TAGLINE}</small></span>
            </Link>

            <nav className="desktop-nav primary-nav" aria-label="Primary navigation">
              <Link href="/schedule" prefetch={false}>Schedule</Link>
              <Link href="/standings" prefetch={false}>Standings</Link>
              <Link href="/stats" prefetch={false}>Players</Link>
              <Link href="/teams" prefetch={false}>Teams</Link>
              <Link href="/stories" prefetch={false}>Stories</Link>
              <HeaderPodcastLink />
              <Link href="/courses" prefetch={false}>Courses</Link>
              <Link href="/history" prefetch={false}>History</Link>
              <FacebookLink size={20} />
              <DesktopRoleLinks />
              <Link className="desktop-account" href="/account" prefetch={false}>My Profile</Link>
            </nav>

            <div className="mobile-header-actions">
              <HeaderPodcastLink />
              <MobileAccountLink />
              <MobileNav />
            </div>
          </div>
        </div>
      </header>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="shell footer-wrap">
        <div className="brand">
          <span className="brand-mark">
            <img src={BRAND_LOGO} alt="Team Clash logo" width={48} height={48} />
          </span>
          <span><strong>{BRAND_NAME}</strong><small>{BRAND_TAGLINE}</small></span>
        </div>
        <p>{FOOTER_COPY}</p>
        <div className="footer-links">
          <Link href="/schedule" prefetch={false}>Schedule</Link>
          <Link href="/standings" prefetch={false}>Standings</Link>
          <Link href="/stats" prefetch={false}>Players</Link>
          <Link href="/history" prefetch={false}>History</Link>
          <Link href="/teams" prefetch={false}>Teams</Link>
          <Link href="/courses" prefetch={false}>Courses</Link>
          <FacebookLink size={20} />
        </div>
      </div>
    </footer>
  );
}
