'use client';

import Link from 'next/link';
import {createContext, type ReactNode, useContext, useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {hasSupabaseConfig} from '@/lib/supabase/config';

type HeaderRole = 'commissioner' | 'captain' | null;

type HeaderAccessState = {
  isSignedIn: boolean;
  role: HeaderRole;
};

const EMPTY_ACCESS: HeaderAccessState = {isSignedIn: false, role: null};
const HeaderAccessContext = createContext<HeaderAccessState>(EMPTY_ACCESS);

export function HeaderAccessProvider({children}: {children: ReactNode}) {
  const [access, setAccess] = useState<HeaderAccessState>(EMPTY_ACCESS);

  useEffect(() => {
    if (!hasSupabaseConfig()) return;

    const supabase = createClient();
    let mounted = true;

    const applySession = async (session: {user?: {id?: string}} | null) => {
      const userId = session?.user?.id;
      if (!userId) {
        if (mounted) setAccess(EMPTY_ACCESS);
        return;
      }

      if (mounted) setAccess({isSignedIn: true, role: null});

      const {data: profile} = await supabase
        .from('launch_profiles')
        .select('role,status')
        .eq('user_id', userId)
        .maybeSingle();

      if (!mounted) return;
      if (profile?.status !== 'Approved') {
        setAccess({isSignedIn: true, role: null});
        return;
      }

      if (profile.role === 'Commissioner') {
        setAccess({isSignedIn: true, role: 'commissioner'});
      } else if (profile.role === 'Captain') {
        setAccess({isSignedIn: true, role: 'captain'});
      } else {
        setAccess({isSignedIn: true, role: null});
      }
    };

    void supabase.auth.getSession().then(({data}) => applySession(data.session));

    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer profile reads until the auth callback has completed.
      window.setTimeout(() => void applySession(session), 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return <HeaderAccessContext.Provider value={access}>{children}</HeaderAccessContext.Provider>;
}

export function useHeaderAccess(): HeaderAccessState {
  return useContext(HeaderAccessContext);
}

export function DesktopRoleLinks() {
  const {role} = useHeaderAccess();
  const canOpenOffice = role === 'commissioner';
  const canOpenCaptain = role === 'captain';

  if (!canOpenOffice && !canOpenCaptain) return null;

  return (
    <>
      <span className="primary-nav-separator" aria-hidden="true" />
      {canOpenOffice ? <Link className="desktop-role-link" href="/admin">Create post</Link> : null}
      {canOpenOffice ? <Link className="desktop-role-link" href="/office">Office</Link> : null}
      {canOpenCaptain ? <Link className="desktop-role-link" href="/captain">Captain</Link> : null}
      {(canOpenCaptain || canOpenOffice) ? <Link className="desktop-role-link" href="/captain/free-agents">Free Agents</Link> : null}
    </>
  );
}
