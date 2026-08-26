'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {hasSupabaseConfig} from '@/lib/supabase/config';

export function MobileAccountLink() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig()) return;

    const supabase = createClient();
    let mounted = true;

    supabase.auth.getSession().then(({data}) => {
      if (mounted) setIsSignedIn(Boolean(data.session));
    });

    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Link className="mobile-sign-in" href="/account">
      {isSignedIn ? 'My Profile' : 'Sign in'}
    </Link>
  );
}
