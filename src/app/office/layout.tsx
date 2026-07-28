import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {OfficeNav} from '@/components/commissioner/OfficeNav';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {BRAND_LOGO, BRAND_NAME} from '@/shared/constants';
import './office.css';

export const metadata: Metadata = {
  title: 'Commissioner Office | CC Team Clash',
  description: 'League administration for CC Team Clash commissioners.',
};

export default async function CommissionerOfficeLayout({children}: Readonly<{children: React.ReactNode}>) {
  await requireCommissionerAccess();

  return (
    <div className="commissioner-office">
      <header className="office-topbar">
        <Link href="/office" className="office-brand">
          <span className="office-brand-mark">
            <Image src={BRAND_LOGO} alt="Team Clash logo" width={48} height={48} priority />
          </span>
          <span>
            <strong>Commissioner Office</strong>
            <small>{BRAND_NAME} control center</small>
          </span>
        </Link>
        <Link href="/" className="office-public-link">View public site</Link>
      </header>
      <div className="office-frame">
        <aside className="office-sidebar">
          <span className="office-nav-label">League operations</span>
          <OfficeNav />
        </aside>
        <main className="office-content">{children}</main>
      </div>
    </div>
  );
}

async function requireCommissionerAccess() {
  if (!hasSupabaseConfig()) {
    redirect('/account?error=Commissioner%20Office%20is%20not%20configured.');
  }

  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) {
    redirect('/account?error=Sign%20in%20with%20an%20approved%20commissioner%20account.');
  }

  const repository = new SupabaseLaunchRepository(supabase);
  const profile = await repository.getProfileByUserId(user.id);

  if (profile?.role !== 'Commissioner' || profile.status !== 'Approved') {
    redirect('/account?error=Approved%20commissioner%20access%20is%20required.');
  }
}
