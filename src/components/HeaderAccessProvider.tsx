'use client';

import Link from 'next/link';
import {createContext, type ReactNode, useContext, useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {hasSupabaseConfig} from '@/lib/supabase/config';

type HeaderRole = 'commissioner' | 'captain' | null;

type HeaderAccessState = {
  isSignedIn: boolean;
  role: HeaderRole;
  canCaptainManage: boolean;
  hasClubhouse: boolean;
  clubhouseHasUnread: boolean;
  currentTeamId: string | null;
  captainTeamId: string | null;
};

const EMPTY_ACCESS: HeaderAccessState = {
  isSignedIn: false,
  role: null,
  canCaptainManage: false,
  hasClubhouse: false,
  clubhouseHasUnread: false,
  currentTeamId: null,
  captainTeamId: null,
};

const HeaderAccessContext = createContext<HeaderAccessState>(EMPTY_ACCESS);

export function HeaderAccessProvider({children}: {children: ReactNode}) {
  const [access, setAccess] = useState<HeaderAccessState>(EMPTY_ACCESS);

  useEffect(() => {
    if (!hasSupabaseConfig()) return;

    const supabase = createClient();
    const db = supabase as any;
    let mounted = true;

    const applySession = async (session: {user?: {id?: string}} | null) => {
      const userId = session?.user?.id;
      if (!userId) {
        if (mounted) setAccess(EMPTY_ACCESS);
        return;
      }

      if (mounted) {
        setAccess({
          isSignedIn: true,
          role: null,
          canCaptainManage: false,
          hasClubhouse: false,
          clubhouseHasUnread: false,
          currentTeamId: null,
          captainTeamId: null,
        });
      }

      const {data: profile} = await supabase
        .from('launch_profiles')
        .select('id,role,status,player_id,captain_team_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!mounted) return;
      if (profile?.status !== 'Approved') {
        setAccess({
          isSignedIn: true,
          role: null,
          canCaptainManage: false,
          hasClubhouse: false,
          clubhouseHasUnread: false,
          currentTeamId: null,
          captainTeamId: null,
        });
        return;
      }

      const canCaptainManage = (
        profile.role === 'Captain' || profile.role === 'Commissioner'
      ) && Boolean(profile.captain_team_id);
      let hasClubhouse = false;
      let clubhouseHasUnread = false;
      let currentTeamId: string | null = null;

      if (profile.player_id) {
        const {data: season} = await db
          .from('launch_seasons')
          .select('id')
          .eq('active', true)
          .eq('archived', false)
          .order('year', {ascending: false})
          .limit(1)
          .maybeSingle();

        if (season?.id) {
          const {data: membership} = await db
            .from('launch_season_roster_memberships')
            .select('team_id')
            .eq('season_id', season.id)
            .eq('player_id', profile.player_id)
            .eq('status', 'Active')
            .limit(1)
            .maybeSingle();

          if (membership?.team_id) {
            currentTeamId = membership.team_id;
            hasClubhouse = true;

            const {data: readState} = await db
              .from('launch_clubhouse_reads')
              .select('last_read_at')
              .eq('profile_id', profile.id)
              .eq('season_id', season.id)
              .eq('team_id', membership.team_id)
              .maybeSingle();

            let unreadQuery = db
              .from('launch_clubhouse_activity')
              .select('activity_id')
              .eq('season_id', season.id)
              .eq('team_id', membership.team_id)
              .neq('author_profile_id', profile.id)
              .order('created_at', {ascending: false})
              .limit(1);

            if (readState?.last_read_at) {
              unreadQuery = unreadQuery.gt('created_at', readState.last_read_at);
            }

            const {data: unreadActivity} = await unreadQuery;
            clubhouseHasUnread = Boolean(unreadActivity?.length);
          }
        }
      }

      if (!mounted) return;
      if (profile.role === 'Commissioner') {
        setAccess({isSignedIn: true, role: 'commissioner', canCaptainManage, hasClubhouse, clubhouseHasUnread, currentTeamId, captainTeamId: profile.captain_team_id ?? null});
      } else if (profile.role === 'Captain') {
        setAccess({isSignedIn: true, role: 'captain', canCaptainManage, hasClubhouse, clubhouseHasUnread, currentTeamId, captainTeamId: profile.captain_team_id ?? null});
      } else {
        setAccess({isSignedIn: true, role: null, canCaptainManage, hasClubhouse, clubhouseHasUnread, currentTeamId, captainTeamId: profile.captain_team_id ?? null});
      }
    };

    const handleClubhouseRead = () => {
      if (!mounted) return;
      setAccess((current) => ({...current, clubhouseHasUnread: false}));
    };

    window.addEventListener('clubhouse-read', handleClubhouseRead);

    void supabase.auth.getSession().then(({data}) => applySession(data.session));

    const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void applySession(session), 0);
    });

    return () => {
      mounted = false;
      window.removeEventListener('clubhouse-read', handleClubhouseRead);
      listener.subscription.unsubscribe();
    };
  }, []);

  return <HeaderAccessContext.Provider value={access}>{children}</HeaderAccessContext.Provider>;
}

export function useHeaderAccess(): HeaderAccessState {
  return useContext(HeaderAccessContext);
}

export function ClubhouseUnreadDisc() {
  return (
    <span className="clubhouse-unread-disc" aria-label="New Clubhouse activity" title="New Clubhouse activity">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <ellipse cx="12" cy="12" rx="9.5" ry="5.3" />
        <path d="M4.1 11.1c2.5 1.3 5.1 1.9 7.9 1.9 2.9 0 5.5-.6 7.9-1.9" />
      </svg>
    </span>
  );
}

export function DesktopRoleLinks() {
  const {
    role,
    canCaptainManage,
    hasClubhouse,
    clubhouseHasUnread,
    currentTeamId,
    captainTeamId,
  } = useHeaderAccess();
  const canOpenOffice = role === 'commissioner';
  const canOpenCaptain = canCaptainManage;
  const teamDestination = currentTeamId ?? captainTeamId;
  const hasTools = hasClubhouse || canOpenOffice || canOpenCaptain;

  if (!teamDestination && !hasTools) return null;

  return (
    <>
      <span className="primary-nav-separator" aria-hidden="true" />
      {teamDestination ? (
        <Link
          className="desktop-role-link clubhouse-nav-link"
          href={`/teams/${encodeURIComponent(teamDestination)}`}
        >
          My Team
          {clubhouseHasUnread ? <ClubhouseUnreadDisc /> : null}
        </Link>
      ) : null}
      {hasTools ? (
        <details className="desktop-more">
          <summary>Tools</summary>
          <div className="desktop-more-menu">
            {hasClubhouse ? <Link href="/clubhouse">Clubhouse</Link> : null}
            {canOpenCaptain ? <Link href="/captain">Captain</Link> : null}
            {canOpenOffice ? <Link href="/admin">Create post</Link> : null}
            {canOpenOffice ? <Link href="/office">Office</Link> : null}
          </div>
        </details>
      ) : null}
    </>
  );
}
