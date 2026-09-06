'use client';

import {useState} from 'react';
import {PublicPlayerProfileCard} from '@/components/players/PublicPlayerProfileCard';
import type {PublicPlayerView} from '@/services/public/PublicPlayerService';
import {createProfileFromPublicPlayerView} from '@/services/playerProfiles';
import type {PlayerStatistics} from '@/services/statistics';
import styles from '@/app/players/Players.module.css';

type PublicPlayerDirectoryProps = {
  players: PublicPlayerView[];
  showFilters?: boolean;
  initialMode?: 'list' | 'search';
  initialPlayerId?: string;
  initialSearch?: string;
};

function formatRecord(statistics: PlayerStatistics): string {
  return formatRecordSummary(statistics.overallRecord);
}

function formatRecordSummary(record: PlayerStatistics['overallRecord']): string {
  return record.ties
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

function normalizeSearchText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function uniquePlayers(players: PublicPlayerView[]): PublicPlayerView[] {
  const playersById = new Map<string, PublicPlayerView>();
  for (const player of players) {
    if (!playersById.has(player.player.id)) {
      playersById.set(player.player.id, player);
    }
  }
  return Array.from(playersById.values());
}

export function PublicPlayerDirectory({
  players,
  showFilters = true,
  initialMode = 'list',
  initialPlayerId = '',
  initialSearch = '',
}: PublicPlayerDirectoryProps) {
  const [search, setSearch] = useState(initialSearch);
  const [selectedPlayerId, setSelectedPlayerId] = useState(initialPlayerId.trim());
  const normalizedSearch = normalizeSearchText(search);
  const normalizedInitialSearch = normalizeSearchText(initialSearch);
  const searchablePlayers = uniquePlayers(players);
  const searchRequired = showFilters && initialMode === 'search';
  const hasSearch = normalizedSearch.length > 0;
  const hasSelection = selectedPlayerId.length > 0 || hasSearch;
  const visiblePlayers = searchRequired && !hasSelection
    ? []
    : searchablePlayers.filter(({player}) =>
      selectedPlayerId
        ? player.id === selectedPlayerId
        : !normalizedSearch || [player.name, player.pdgaNumber].some((value) => normalizeSearchText(value).includes(normalizedSearch)));

  return (
    <>
      {showFilters ? <div className={styles.filters}>
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
      </div> : null}

      <div className={styles.directory}>
        {visiblePlayers.map((playerView) => {
          const {player, teamName, currentSeasonName, currentStatistics, careerStatistics} = playerView;
          const openFromLink = selectedPlayerId
            ? player.id === selectedPlayerId
            : normalizedInitialSearch.length > 0 && normalizeSearchText(player.name) === normalizedInitialSearch;

          return (
            <details className={styles.player} key={player.id} open={openFromLink || undefined}>
              <summary>
                <span>
                  <strong>{player.name}</strong>
                  <small>{teamName}</small>
                </span>
                <span className={styles.summaryStats}>
                  <b>{formatRecord(currentStatistics ?? careerStatistics)}</b>
                  <small>{currentStatistics ? currentSeasonName : 'Career'}</small>
                </span>
                <span className={styles.expandLabel}>View stats</span>
              </summary>
              <div className={styles.details}>
                <PublicPlayerProfileCard profile={createProfileFromPublicPlayerView(playerView)} />
              </div>
            </details>
          );
        })}
        {!visiblePlayers.length ? (
          <div className={styles.empty}>
            <h2>{searchRequired && !hasSelection ? 'Search for a player' : 'No players found'}</h2>
            <p>{searchRequired && !hasSelection
              ? 'Player details will appear here as soon as you start typing.'
              : 'Try another player name.'}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
