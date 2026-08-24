import Link from 'next/link';
import Image from 'next/image';
import {MobileAccountLink} from '@/components/MobileAccountLink';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE, FOOTER_COPY} from '@/shared/constants';

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
              <Image src={BRAND_LOGO} alt="Team Clash logo" width={48} height={48} priority />
            </span>
            <span><strong>{BRAND_NAME}</strong><small>{BRAND_TAGLINE}</small></span>
          </Link>

          <nav className="desktop-nav primary-nav" aria-label="Primary navigation">
            <Link href="/schedule">Schedule</Link>
            <Link href="/standings">Standings</Link>
            <Link href="/rankings">Rankings</Link>
            <span className="primary-nav-separator" aria-hidden="true" />
            <Link href="/teams">Teams</Link>
            <Link href="/stories">Stories</Link>
            <Link className="desktop-account" href="/account">Account</Link>
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
                  <Link href="/rankings">Rankings</Link>
                </div>
                <div className="mobile-nav-group">
                  <span>League</span>
                  <Link href="/teams">Teams</Link>
                  <Link href="/stories">Stories</Link>
                  <Link href="/players">Players</Link>
                  <Link href="/courses">Courses</Link>
                  <Link href="/history">History</Link>
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
          {(canOpenOffice || canOpenCaptain) ? (
            <nav className="secondary-role-nav" aria-label="Role tools">
              {canOpenOffice ? <Link className="secondary-post" href="/admin">Create post</Link> : null}
              {canOpenOffice ? <Link href="/office">Office</Link> : null}
              {canOpenCaptain ? <Link href="/captain">Captain</Link> : null}
            </nav>
          ) : null}
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
            <Image src={BRAND_LOGO} alt="Team Clash logo" width={48} height={48} />
          </span>
          <span><strong>{BRAND_NAME}</strong><small>{BRAND_TAGLINE}</small></span>
        </div>
        <p>{FOOTER_COPY}</p>
        <div className="footer-links">
          <Link href="/schedule">Schedule</Link>
          <Link href="/standings">Standings</Link>
          <Link href="/playoffs">Playoffs</Link>
          <Link href="/rankings">Rankings</Link>
          <Link href="/history">History</Link>
          <Link href="/teams">Teams</Link>
          <Link href="/courses">Courses</Link>
          {canCreatePost ? <Link href="/admin">Post</Link> : null}
        </div>
      </div>
    </footer>
  );
}
