'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {hasSupabaseConfig} from '@/lib/supabase/config';

export function MobileAccountLink() {
  const router = useRouter();
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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsSignedIn(false);
    router.refresh();
  }

  if (isSignedIn) {
    return (
      <button className="mobile-sign-in" type="button" onClick={handleSignOut}>
        Sign out
      </button>
    );
  }

  return <Link className="mobile-sign-in" href="/account">Sign in</Link>;
}
