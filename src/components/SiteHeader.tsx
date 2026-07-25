import Link from 'next/link';
import Image from 'next/image';
import {BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE, FOOTER_COPY} from '@/shared/constants';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell nav-wrap">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Image src={BRAND_LOGO} alt="Team Clash logo" width={48} height={48} priority />
          </span>
          <span><strong>{BRAND_NAME}</strong><small>{BRAND_TAGLINE}</small></span>
        </Link>
        <nav className="desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/stories">Stories</Link>
          <Link href="/schedule">Schedule</Link>
          <Link href="/standings">Standings</Link>
          <Link href="/rankings">Rankings</Link>
          <Link href="/teams">Teams</Link>
          <Link href="/players">Players</Link>
          <Link href="/courses">Courses</Link>
          <Link className="post-nav" href="/admin">Create post</Link>
          <Link href="/account">Account</Link>
        </nav>
        <Link className="mobile-sign-in" href="/account">Sign in</Link>
        <div className="mobile-header-actions">
          <details className="mobile-nav">
            <summary>Menu</summary>
            <nav>
              <Link href="/">Home</Link>
              <Link href="/rankings">Rankings</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/players">Players</Link>
              <Link href="/courses">Courses</Link>
              <Link href="/schedule">Schedule</Link>
              <Link href="/standings">Standings</Link>
              <Link href="/stories">Stories</Link>
            </nav>
          </details>
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
            <Image src={BRAND_LOGO} alt="Team Clash logo" width={48} height={48} />
          </span>
          <span><strong>{BRAND_NAME}</strong><small>{BRAND_TAGLINE}</small></span>
        </div>
        <p>{FOOTER_COPY}</p>
        <div className="footer-links">
          <Link href="/schedule">Schedule</Link>
          <Link href="/standings">Standings</Link>
          <Link href="/rankings">Rankings</Link>
          <Link href="/courses">Courses</Link>
          <Link href="/admin">Post</Link>
        </div>
      </div>
    </footer>
  );
}
