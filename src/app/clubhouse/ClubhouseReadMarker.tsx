'use client';

import {useEffect} from 'react';
import {createClient} from '@/lib/supabase/client';

type Props = {
  profileId: string;
  seasonId: string;
  teamId: string;
  readThrough: string;
};

export function ClubhouseReadMarker({profileId, seasonId, teamId, readThrough}: Props) {
  useEffect(() => {
    const supabase = createClient();
    const db = supabase as any;
    let cancelled = false;

    void db
      .from('launch_clubhouse_reads')
      .upsert(
        {
          profile_id: profileId,
          season_id: seasonId,
          team_id: teamId,
          last_read_at: readThrough,
        },
        {onConflict: 'profile_id,season_id,team_id'},
      )
      .then(({error}: {error: {message?: string} | null}) => {
        if (!cancelled && !error) {
          window.dispatchEvent(new Event('clubhouse-read'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profileId, readThrough, seasonId, teamId]);

  return null;
}
