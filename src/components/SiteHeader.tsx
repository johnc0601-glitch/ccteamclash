import Link from 'next/link';
import {MobileAccountLink} from '@/components/MobileAccountLink';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
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

export async function SiteHeader() {
  const headerAccess = await getHeaderAccess();
  const canOpenOffice = headerAccess === 'commissioner';
  const canOpenCaptain = headerAccess === 'captain';

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
            <Link href="/schedule">Schedule</Link>
            <Link href="/standings">Standings</Link>
            <Link href="/playoffs">Playoffs</Link>
            <Link href="/rankings">Rankings</Link>
            <Link href="/stats">Stats</Link>
            <span className="primary-nav-separator" aria-hidden="true" />
            <Link href="/teams">Teams</Link>
            <Link href="/stories">Stories</Link>
            <Link className="desktop-account" href="/account">My Profile</Link>
          </nav>

          <div className="mobile-header-actions">
            <MobileAccountLink />
            <details className="mobile-nav">
              <summary aria-label="Menu"><span aria-hidden="true">☰</span></summary>
              <nav>
                <div className="mobile-nav-group">
                  <span>Season</span>
                  <Link href="/schedule">Schedule</Link>
                  <Link href="/standings">Standings</Link>
                  <Link href="/playoffs">Playoffs</Link>
                  <Link href="/rankings">Rankings</Link>
                  <Link href="/stats">Stats</Link>
                </div>
                <div className="mobile-nav-group">
                  <span>League</span>
                  <Link href="/teams">Teams</Link>
                  <Link href="/stories">Stories</Link>
                  <Link href="/players">Players</Link>
                  <Link href="/courses">Courses</Link>
                  <Link href="/history">History</Link>
                </div>
                <div className="mobile-nav-group">
                  <span>Community</span>
                  <div style={{padding: '10px 8px'}}><FacebookLink size={22} /></div>
                </div>
                {(canOpenOffice || canOpenCaptain) ? (
                  <div className="mobile-nav-group mobile-nav-tools">
                    <span>Tools</span>
                    {canOpenOffice ? <Link href="/admin">Create post</Link> : null}
                    {canOpenOffice ? <Link href="/office">Office</Link> : null}
                    {canOpenCaptain ? <Link href="/captain">Captain</Link> : null}
                  </div>
                ) : null}
              </nav>
            </details>
          </div>
        </div>
      </div>

      <div className="secondary-header">
        <div className="shell secondary-nav-wrap">
          <nav className="secondary-nav" aria-label="League navigation">
            <Link href="/players">Players</Link>
            <Link href="/courses">Courses</Link>
            <Link href="/history">History</Link>
          </nav>
          <nav className="secondary-role-nav" aria-label="Community and role tools">
            {canOpenOffice ? <Link className="secondary-post" href="/admin">Create post</Link> : null}
            {canOpenOffice ? <Link href="/office">Office</Link> : null}
            {canOpenCaptain ? <Link href="/captain">Captain</Link> : null}
            <FacebookLink size={20} />
          </nav>
        </div>
      </div>
    </header>
  );
}

async function getHeaderAccess(): Promise<'commissioner' | 'captain' | null> {
  if (!hasSupabaseConfig()) return null;

  try {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return null;

    const repository = new SupabaseLaunchRepository(supabase);
    const profile = await repository.getProfileByUserId(user.id);
    if (profile?.role === 'Commissioner' && profile.status === 'Approved') return 'commissioner';
    if (profile?.role === 'Captain' && profile.status === 'Approved') return 'captain';
    return null;
  } catch {
    return null;
  }
}

export async function Footer() {
  const canCreatePost = await getHeaderAccess() === 'commissioner';

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
          <Link href="/playoffs">Playoffs</Link>
          <Link href="/rankings">Rankings</Link>
          <Link href="/stats">Stats</Link>
          <Link href="/history">History</Link>
          <Link href="/teams">Teams</Link>
          <Link href="/courses">Courses</Link>
          <FacebookLink size={20} />
          {canCreatePost ? <Link href="/admin">Post</Link> : null}
        </div>
      </div>
    </footer>
  );
}
