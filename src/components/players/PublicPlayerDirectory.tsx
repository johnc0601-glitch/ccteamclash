'use client';

import Link from 'next/link';
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
  showRankingsLink?: boolean;
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
  showRankingsLink = false,
}: PublicPlayerDirectoryProps) {
  const [search, setSearch] = useState('');
  const normalizedSearch = normalizeSearchText(search);
  const searchablePlayers = uniquePlayers(players);
  const searchRequired = showFilters && initialMode === 'search';
  const hasSearch = normalizedSearch.length > 0;
  const visiblePlayers = searchRequired && !hasSearch
    ? []
    : searchablePlayers.filter(({player}) =>
      !normalizedSearch || [
        player.name,
        player.pdgaNumber,
      ].some((value) => normalizeSearchText(value).includes(normalizedSearch)));

  return (
    <>
      {showFilters ? <div className={styles.filters}>
        <label>
          <span>Find player</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by player name"
          />
        </label>
        {showRankingsLink ? <Link className={styles.rankingsLink} href="/rankings">Rankings</Link> : null}
      </div> : null}

      <div className={styles.directory}>
        {visiblePlayers.map((playerView) => {
          const {player, teamName, currentSeasonName, currentStatistics, careerStatistics} = playerView;

          return (
            <details className={styles.player} key={player.id}>
              <summary>
                <span><strong>{player.name}</strong><small>{teamName}</small></span>
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
            <h2>{searchRequired && !hasSearch ? 'Search for a player' : 'No players found'}</h2>
            <p>{searchRequired && !hasSearch
              ? 'Player details will appear here as soon as you start typing.'
              : 'Try another player name.'}</p>
            {showRankingsLink ? <Link href="/rankings">View rankings</Link> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
