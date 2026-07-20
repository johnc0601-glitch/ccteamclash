'use client';

import {useEffect, useState} from 'react';
import {services} from '@/core/ServiceContainer';
import type {Team} from '@/models/Team';
import {TeamBanner} from '@/components/teams/TeamBanner';

type ClientTeamBannerProps = {
  initialTeam: Team;
};

export function ClientTeamBanner({initialTeam}: ClientTeamBannerProps) {
  const [team, setTeam] = useState(initialTeam);

  useEffect(() => {
    let cancelled = false;

    services.teams.getById(initialTeam.id).then((nextTeam) => {
      if (!cancelled && nextTeam) setTeam(nextTeam);
    });

    return () => {
      cancelled = true;
    };
  }, [initialTeam.id]);

  return <TeamBanner team={team} />;
}
