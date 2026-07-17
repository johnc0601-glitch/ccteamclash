import type {Metadata} from 'next';
import Link from 'next/link';
import {OfficeNav} from '@/components/commissioner/OfficeNav';
import {BRAND_MARK, BRAND_NAME} from '@/shared/constants';
import './office.css';

export const metadata: Metadata = {
  title: 'Commissioner Office | CC Team Clash',
  description: 'League administration for CC Team Clash commissioners.',
};

export default function CommissionerOfficeLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <div className="commissioner-office">
      <header className="office-topbar">
        <Link href="/office" className="office-brand">
          <span className="office-brand-mark">{BRAND_MARK}</span>
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
