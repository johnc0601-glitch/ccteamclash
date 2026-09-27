export type AppTabIcon = 'home' | 'team' | 'matchday' | 'league' | 'me';

export type AppShellTab = {
  label: string;
  href: string;
  active: boolean;
  icon: AppTabIcon;
};

export function getAppShellTabs(pathname: string, activeTeamId: string | null): AppShellTab[] {
  const teamHref = activeTeamId ? `/teams/${encodeURIComponent(activeTeamId)}` : '/teams';
  const isOwnTeamRoute = Boolean(activeTeamId && pathname === teamHref);
  const isOtherTeamRoute = Boolean(
    activeTeamId
      && (pathname === '/teams' || (pathname.startsWith('/teams/') && !isOwnTeamRoute)),
  );

  return [
    {label: 'Home', href: '/', active: pathname === '/', icon: 'home'},
    {
      label: 'Team',
      href: teamHref,
      active: pathname === '/clubhouse'
        || pathname.startsWith('/captain')
        || (activeTeamId ? isOwnTeamRoute : pathname === '/teams'),
      icon: 'team',
    },
    {
      label: 'Matchday',
      href: '/matchday',
      active: pathname === '/matchday' || pathname.startsWith('/matches/'),
      icon: 'matchday',
    },
    {
      label: 'League',
      href: '/league',
      active: pathname === '/league'
        || isOtherTeamRoute
        || ['/standings', '/stats', '/players', '/schedule', '/stories', '/courses', '/history', '/playoffs']
          .some((route) => pathname === route || pathname.startsWith(`${route}/`)),
      icon: 'league',
    },
    {
      label: 'Me',
      href: '/account',
      active: pathname === '/account' || pathname.startsWith('/account/') || pathname.startsWith('/auth/'),
      icon: 'me',
    },
  ];
}
