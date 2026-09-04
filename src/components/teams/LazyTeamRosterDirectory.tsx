'use client';

import {useState} from 'react';
import {
  loadTeamRosterPlayerProfile,
  type TeamRosterPlayerProfileRequest,
} from '@/app/teams/actions';
import {PublicPlayerProfileCard} from '@/components/players/PublicPlayerProfileCard';
import type {PlayerProfile} from '@/services/playerProfiles';
import type {PublicRosterPlayerSummary} from '@/services/public/PublicRosterSummary';
import styles from '@/app/players/Players.module.css';

type LazyTeamRosterDirectoryProps = {
  players: PublicRosterPlayerSummary[];
  teamId: string;
  teamName: string;
  seasonId: string;
  currentSeasonName: string;
};

export function LazyTeamRosterDirectory({
  players,
  teamId,
  teamName,
  seasonId,
  currentSeasonName,
}: LazyTeamRosterDirectoryProps) {
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function loadProfile(player: PublicRosterPlayerSummary) {
    if (profiles[player.id] !== undefined || loading[player.id]) return;

    setLoading((current) => ({...current, [player.id]: true}));
    setErrors((current) => ({...current, [player.id]: ''}));
    const request: TeamRosterPlayerProfileRequest = {
      seasonId,
      teamId,
      teamName,
      currentSeasonName,
      playerId: player.id,
      playerName: player.name,
    };

    try {
      const profile = await loadTeamRosterPlayerProfile(request);
      if (!profile) {
        setProfiles((current) => ({...current, [player.id]: null}));
        setErrors((current) => ({...current, [player.id]: 'Player stats could not be loaded.'}));
        return;
      }
      setProfiles((current) => ({...current, [player.id]: profile}));
    } catch {
      setErrors((current) => ({...current, [player.id]: 'Player stats could not be loaded.'}));
    } finally {
      setLoading((current) => ({...current, [player.id]: false}));
    }
  }

  return (
    <div className={styles.directory}>
      {players.map((player) => {
        const profile = profiles[player.id];
        const isLoading = loading[player.id] === true;
        const error = errors[player.id];

        return (
          <details
            className={styles.player}
            key={player.id}
            onToggle={(event) => {
              if (event.currentTarget.open) void loadProfile(player);
            }}
          >
            <summary>
              <span>
                <strong>{player.name}</strong>
                <small>{teamName}</small>
              </span>
              <span className={styles.summaryStats}>
                <b>{player.record}</b>
                <small>{player.recordLabel}</small>
              </span>
              <span className={styles.expandLabel}>View stats</span>
            </summary>
            <div className={styles.details}>
              {profile ? <PublicPlayerProfileCard profile={profile} /> : null}
              {isLoading ? <p className={styles.empty}>Loading player stats...</p> : null}
              {!isLoading && error ? <p className={styles.empty} role="alert">{error}</p> : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}
