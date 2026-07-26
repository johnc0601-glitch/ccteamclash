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
          {canOpenOffice ? <Link href="/office">Office</Link> : null}
          {canOpenCaptain ? <Link href="/captain">Captain</Link> : null}
          <Link href="/account">Account</Link>
        </nav>
        <MobileAccountLink />
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
              {canOpenOffice ? <Link href="/office">Office</Link> : null}
              {canOpenCaptain ? <Link href="/captain">Captain</Link> : null}
            </nav>
          </details>
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
