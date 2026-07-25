'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {hasSupabaseConfig} from '@/lib/supabase/config';

export function MobileAccountLink() {
  const [label, setLabel] = useState('Sign in');

  useEffect(() => {
    if (!hasSupabaseConfig()) return;

    const supabase = createClient();
    let mounted = true;

    supabase.auth.getSession().then(({data}) => {
      if (mounted) setLabel(data.session ? 'Account' : 'Sign in');
    });

    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
      setLabel(session ? 'Account' : 'Sign in');
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return <Link className="mobile-sign-in" href="/account">{label}</Link>;
}
