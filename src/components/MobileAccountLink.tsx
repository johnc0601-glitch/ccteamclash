'use client';

import Link from 'next/link';
import {useHeaderAccess} from '@/components/HeaderAccessProvider';

export function MobileAccountLink() {
  const {isSignedIn} = useHeaderAccess();

  return (
    <Link className="mobile-sign-in" href="/account">
      {isSignedIn ? 'My Profile' : 'Sign in'}
    </Link>
  );
}
