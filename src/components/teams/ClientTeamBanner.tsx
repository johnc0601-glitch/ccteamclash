'use client';

import {useEffect, useState} from 'react';
import type {Team} from '@/models/Team';
import {TeamBanner} from '@/components/teams/TeamBanner';

type ClientTeamBannerProps = {
  initialTeam: Team;
};

export function ClientTeamBanner({initialTeam}: ClientTeamBannerProps) {
  const [team, setTeam] = useState(initialTeam);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/teams?id=${encodeURIComponent(initialTeam.id)}`, {cache: 'no-store'})
      .then((response) => response.json() as Promise<{team?: Team}>)
      .then((payload) => {
        if (!cancelled && payload.team) setTeam(payload.team);
      });

    return () => {
      cancelled = true;
    };
  }, [initialTeam.id]);

  return <TeamBanner team={team} />;
}
