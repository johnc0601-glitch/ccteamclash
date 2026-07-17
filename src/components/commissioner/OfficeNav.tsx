'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {OFFICE_NAV_ITEMS} from '@/shared/constants/commissioner';

export function OfficeNav() {
  const pathname = usePathname();

  return (
    <nav className="office-nav" aria-label="Commissioner Office">
      {OFFICE_NAV_ITEMS.map((item) => {
        const isActive = item.href === '/office'
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? 'office-nav-link active' : 'office-nav-link'}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
