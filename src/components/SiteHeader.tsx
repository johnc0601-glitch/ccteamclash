import Link from 'next/link';
import {DesktopRoleLinks, HeaderAccessProvider} from '@/components/HeaderAccessProvider';
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

export function SiteHeader() {
  return (
    <HeaderAccessProvider>
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
              <Link href="/schedule">Schedule</Link>
              <Link href="/standings">Standings</Link>
              <Link href="/stats">Stats</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/players">Players</Link>
              <Link href="/stories">Stories</Link>
              <Link href="/courses">Courses</Link>
              <Link href="/history">History</Link>
              <FacebookLink size={20} />
              <DesktopRoleLinks />
              <Link className="desktop-account" href="/account">My Profile</Link>
            </nav>

            <div className="mobile-header-actions">
              <MobileAccountLink />
              <MobileNav />
            </div>
          </div>
        </div>
      </header>
    </HeaderAccessProvider>
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
          <Link href="/schedule">Schedule</Link>
          <Link href="/standings">Standings</Link>
          <Link href="/stats">Stats</Link>
          <Link href="/history">History</Link>
          <Link href="/teams">Teams</Link>
          <Link href="/courses">Courses</Link>
          <FacebookLink size={20} />
        </div>
      </div>
    </footer>
  );
}
