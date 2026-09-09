'use client';

import Link from 'next/link';
import {createContext, type ReactNode, useContext, useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {hasSupabaseConfig} from '@/lib/supabase/config';

type HeaderRole = 'commissioner' | 'captain' | null;

type HeaderAccessState = {
  isSignedIn: boolean;
  role: HeaderRole;
  hasClubhouse: boolean;
};

const EMPTY_ACCESS: HeaderAccessState = {isSignedIn: false, role: null, hasClubhouse: false};
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

      if (mounted) setAccess({isSignedIn: true, role: null, hasClubhouse: false});

      const {data: profile} = await supabase
        .from('launch_profiles')
        .select('role,status,player_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!mounted) return;
      if (profile?.status !== 'Approved') {
        setAccess({isSignedIn: true, role: null, hasClubhouse: false});
        return;
      }

      let hasClubhouse = false;
      if (profile.player_id) {
        const {data: season} = await (supabase as any)
          .from('launch_seasons')
          .select('id')
          .eq('active', true)
          .eq('archived', false)
          .order('year', {ascending: false})
          .limit(1)
          .maybeSingle();
        if (season?.id) {
          const {data: membership} = await (supabase as any)
            .from('launch_season_roster_memberships')
            .select('id')
            .eq('season_id', season.id)
            .eq('player_id', profile.player_id)
            .eq('status', 'Active')
            .limit(1)
            .maybeSingle();
          hasClubhouse = Boolean(membership);
        }
      }

      if (!mounted) return;
      if (profile.role === 'Commissioner') {
        setAccess({isSignedIn: true, role: 'commissioner', hasClubhouse});
      } else if (profile.role === 'Captain') {
        setAccess({isSignedIn: true, role: 'captain', hasClubhouse});
      } else {
        setAccess({isSignedIn: true, role: null, hasClubhouse});
      }
    };

    void supabase.auth.getSession().then(({data}) => applySession(data.session));

    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
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
  const {role, hasClubhouse} = useHeaderAccess();
  const canOpenOffice = role === 'commissioner';
  const canOpenCaptain = role === 'captain';

  if (!canOpenOffice && !canOpenCaptain && !hasClubhouse) return null;

  return (
    <>
      <span className="primary-nav-separator" aria-hidden="true" />
      {hasClubhouse ? <Link className="desktop-role-link" href="/clubhouse">Clubhouse</Link> : null}
      {canOpenOffice ? <Link className="desktop-role-link" href="/admin">Create post</Link> : null}
      {canOpenOffice ? <Link className="desktop-role-link" href="/office">Office</Link> : null}
      {canOpenCaptain ? <Link className="desktop-role-link" href="/captain">Captain</Link> : null}
    </>
  );
}
