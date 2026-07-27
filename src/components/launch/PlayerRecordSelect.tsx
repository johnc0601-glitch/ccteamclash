'use client';

import {useMemo, useState} from 'react';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';

type PlayerRecordSelectProps = {
  id: string;
  name: string;
  players: LaunchPlayer[];
  defaultValue?: string;
  includeEmptyOption?: boolean;
  emptyLabel?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  required?: boolean;
};

export function PlayerRecordSelect({
  defaultValue = '',
  emptyLabel = 'Select player',
  id,
  includeEmptyOption = true,
  name,
  players,
  searchLabel = 'Search player records',
  searchPlaceholder = 'Search player records',
  required = false,
}: PlayerRecordSelectProps) {
  const [search, setSearch] = useState('');
  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return players;
    return players.filter((player) => {
      const searchable = `${player.name} ${player.pdgaNumber} ${player.pdgaRating ?? ''}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [players, search]);

  return (
    <>
      <input
        aria-label={searchLabel}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={searchPlaceholder}
        type="search"
        value={search}
      />
      <select id={id} name={name} defaultValue={defaultValue} required={required}>
        {includeEmptyOption ? <option value="">{emptyLabel}</option> : null}
        {filteredPlayers.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}{player.pdgaNumber ? ` - PDGA ${player.pdgaNumber}` : ''}
          </option>
        ))}
      </select>
    </>
  );
}
