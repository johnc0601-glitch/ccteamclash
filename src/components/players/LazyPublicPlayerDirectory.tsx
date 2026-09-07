'use client';

import {useState} from 'react';
import {loadPublicPlayerProfile} from '@/app/players/actions';
import {PublicPlayerProfileCard} from '@/components/players/PublicPlayerProfileCard';
import type {PlayerProfile} from '@/services/playerProfiles';
import type {PublicPlayerSearchEntry} from '@/services/public/PublicPlayerService';
import styles from '@/app/players/Players.module.css';

type LazyPublicPlayerDirectoryProps = {
  players: PublicPlayerSearchEntry[];
  initialPlayerId?: string;
  initialSearch?: string;
  initialProfile?: PlayerProfile;
};

function normalizeSearchText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function LazyPublicPlayerDirectory({
  players,
  initialPlayerId = '',
  initialSearch = '',
  initialProfile,
}: LazyPublicPlayerDirectoryProps) {
  const [search, setSearch] = useState(initialSearch);
  const [selectedPlayerId, setSelectedPlayerId] = useState(initialPlayerId.trim());
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile | null>>(
    initialProfile ? {[initialProfile.player.id]: initialProfile} : {},
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const normalizedSearch = normalizeSearchText(search);
  const normalizedInitialSearch = normalizeSearchText(initialSearch);
  const hasSearch = normalizedSearch.length > 0;
  const hasSelection = selectedPlayerId.length > 0 || hasSearch;
  const visiblePlayers = !hasSelection
    ? []
    : players.filter((player) =>
      selectedPlayerId
        ? player.id === selectedPlayerId
        : [player.name, player.pdgaNumber]
          .some((value) => normalizeSearchText(value).includes(normalizedSearch)));

  async function loadProfile(player: PublicPlayerSearchEntry) {
    if (profiles[player.id] !== undefined || loading[player.id]) return;

    setLoading((current) => ({...current, [player.id]: true}));
    setErrors((current) => ({...current, [player.id]: ''}));
    try {
      const profile = await loadPublicPlayerProfile(player.id);
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
    <>
      <div className={styles.filters}>
        <label>
          <span>Find player</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSelectedPlayerId('');
              setSearch(event.target.value);
            }}
            placeholder="Search by player name"
          />
        </label>
      </div>

      <div className={styles.directory}>
        {visiblePlayers.map((player) => {
          const profile = profiles[player.id];
          const isLoading = loading[player.id] === true;
          const error = errors[player.id];
          const openFromLink = selectedPlayerId
            ? player.id === selectedPlayerId
            : normalizedInitialSearch.length > 0
              && normalizeSearchText(player.name) === normalizedInitialSearch;

          return (
            <details
              className={styles.player}
              key={player.id}
              open={openFromLink || undefined}
              onToggle={(event) => {
                if (event.currentTarget.open) void loadProfile(player);
              }}
            >
              <summary>
                <span>
                  <strong>{player.name}</strong>
                  <small>{player.teamName}</small>
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
        {!visiblePlayers.length ? (
          <div className={styles.empty}>
            <h2>{!hasSelection ? 'Search for a player' : 'No players found'}</h2>
            <p>{!hasSelection
              ? 'Player details will appear here as soon as you start typing.'
              : 'Try another player name.'}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
