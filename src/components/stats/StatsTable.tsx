'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import type {StatsGroup, StatsRow} from '@/app/stats/page';
import styles from '@/app/stats/Stats.module.css';

type SortKey = 'playerName' | 'matchesPlayed' | 'wins' | 'winPercentage' | 'points' | 'singles' | 'doubles';
type Direction = 'asc' | 'desc';
type Limit = 5 | 10 | 25 | 'all';
type Division = 'Open' | 'Women';

export function StatsTable({groups, initialGroupId = 'overall'}: {groups: StatsGroup[]; initialGroupId?: string}) {
  const validInitialGroupId = groups.some((group) => group.id === initialGroupId) ? initialGroupId : groups[0]?.id ?? 'overall';
  const [groupId, setGroupId] = useState(validInitialGroupId);
  const [sortKey, setSortKey] = useState<SortKey>('points');
  const [direction, setDirection] = useState<Direction>('desc');
  const [limit, setLimit] = useState<Limit>(5);
  const [division, setDivision] = useState<Division>('Open');
  const [team, setTeam] = useState('all');
  const [search, setSearch] = useState('');

  const group = groups.find((entry) => entry.id === groupId) ?? groups[0];
  const teams = useMemo(() => {
    if (!group) return [];
    return Array.from(new Set(group.rows.flatMap((row) => row.teamNames).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
  }, [group]);

  const filteredRows = useMemo(() => {
    if (!group) return [];
    const query = search.trim().toLowerCase();
    return group.rows.filter((row) => {
      const divisionMatch = division === 'Women' ? row.gender === 'Women' : true;
      const teamMatch = team === 'all' || row.teamNames.includes(team);
      const searchMatch = !query || row.playerName.toLowerCase().includes(query) || row.teamNames.some((name) => name.toLowerCase().includes(query));
      return divisionMatch && teamMatch && searchMatch;
    });
  }, [group, division, team, search]);

  const sortedRows = useMemo(() => [...filteredRows].sort((a, b) => compareRows(a, b, sortKey, direction)), [filteredRows, sortKey, direction]);
  const rows = limit === 'all' ? sortedRows : sortedRows.slice(0, limit);
  const hasCustomView = division !== 'Open' || team !== 'all' || search.trim() !== '' || limit !== 5 || sortKey !== 'points' || direction !== 'desc';

  function selectGroup(nextGroupId: string) {
    setGroupId(nextGroupId);
    resetControls();
    window.history.replaceState(window.history.state, '', nextGroupId === 'overall' ? '/stats' : `/stats?season=${encodeURIComponent(nextGroupId)}`);
  }

  function resetControls() {
    setDivision('Open');
    setTeam('all');
    setSearch('');
    setLimit(5);
    setSortKey('points');
    setDirection('desc');
  }

  function toggleSort(next: SortKey) {
    if (sortKey === next) {
      setDirection((value) => value === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSortKey(next);
    setDirection(next === 'playerName' ? 'asc' : 'desc');
  }

  if (!group) return null;

  return (
    <section className={styles.statsShell}>
      <div className={styles.controls}>
        <div className={styles.seasonTabs} aria-label="Stats season">
          {groups.map((entry) => (
            <button key={entry.id} type="button" className={entry.id === group.id ? styles.activeSeason : undefined} onClick={() => selectGroup(entry.id)}>
              {entry.label}
            </button>
          ))}
        </div>

        <div className={styles.secondaryControls}>
          <div className={styles.divisionTabs} aria-label="Stats division">
            <button type="button" className={division === 'Open' ? styles.activeDivision : undefined} onClick={() => {setDivision('Open'); setLimit(5);}}>Open</button>
            <button type="button" className={division === 'Women' ? styles.activeDivision : undefined} onClick={() => {setDivision('Women'); setLimit(5);}}>Women</button>
          </div>

          <select aria-label="Filter by team" value={team} onChange={(event) => {setTeam(event.target.value); setLimit(5);}}>
            <option value="all">All teams</option>
            {teams.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
          </select>

          <input aria-label="Search players" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player" />
        </div>

        <div className={styles.mobileSortControl}>
          <select aria-label="Sort stats" value={sortKey} onChange={(event) => {const next = event.target.value as SortKey; setSortKey(next); setDirection(next === 'playerName' ? 'asc' : 'desc');}}>
            <option value="points">Points</option>
            <option value="wins">Wins</option>
            <option value="winPercentage">Win %</option>
            <option value="matchesPlayed">Matches</option>
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
            <option value="playerName">Name</option>
          </select>
          <button type="button" onClick={() => setDirection((value) => value === 'desc' ? 'asc' : 'desc')}>
            {sortKey === 'playerName' ? (direction === 'asc' ? 'A → Z' : 'Z → A') : (direction === 'desc' ? 'High → Low' : 'Low → High')}
          </button>
        </div>
      </div>

      <div className={styles.tableMeta}>
        <div>
          <strong>{group.label} · {division}{team !== 'all' ? ` · ${team}` : ''}</strong>
          <span>{filteredRows.length} players · ranked by {sortLabel(sortKey)} {direction === 'desc' ? '↓' : '↑'}</span>
        </div>
        <div className={styles.tableActions}>
          <label className={styles.showControl}>
            <span>Show</span>
            <select value={limit} onChange={(event) => setLimit(event.target.value === 'all' ? 'all' : Number(event.target.value) as 5 | 10 | 25)}>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value="all">All</option>
            </select>
          </label>
          {hasCustomView ? <button type="button" className={styles.resetButton} onClick={resetControls}>Reset view</button> : null}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.statsTable}>
          <thead>
            <tr>
              <SortableHeader label="Name" sort="playerName" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="M" sort="matchesPlayed" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="W" sort="wins" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Win %" sort="winPercentage" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Singles" sort="singles" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Doubles" sort="doubles" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Pts" sort="points" active={sortKey} direction={direction} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rank = sortedRows.findIndex((entry) => entry.playerId === row.playerId) + 1;
              return (
                <tr key={`${group.id}-${row.playerId}`}>
                  <td><span className={styles.rank}>{rank}</span><Link className={styles.playerLink} href={`/players?search=${encodeURIComponent(row.playerName)}`}>{row.playerName}</Link></td>
                  <td>{row.matchesPlayed}</td>
                  <td>{row.wins}</td>
                  <td>{row.winPercentage.toFixed(1)}%{row.matchesPlayed < 5 ? <span className={styles.smallSample}>*</span> : null}</td>
                  <td>{formatRecord(row.singlesWins, row.singlesLosses, row.singlesTies)}</td>
                  <td>{formatRecord(row.doublesWins, row.doublesLosses, row.doublesTies)}</td>
                  <td><strong>{formatPoints(row.points)}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? <p className={styles.emptyState}>No players match these filters.</p> : null}
      </div>
      <p className={styles.qualifierNote}>* Fewer than 5 recorded results.</p>
    </section>
  );
}

function SortableHeader({label, sort, active, direction, onSort}: {label: string; sort: SortKey; active: SortKey; direction: Direction; onSort: (sort: SortKey) => void}) {
  return (
    <th aria-sort={active === sort ? (direction === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <button type="button" onClick={() => onSort(sort)}>{label}<span aria-hidden="true">{active === sort ? (direction === 'desc' ? ' ↓' : ' ↑') : ''}</span></button>
    </th>
  );
}

function compareRows(a: StatsRow, b: StatsRow, key: SortKey, direction: Direction): number {
  const factor = direction === 'asc' ? 1 : -1;
  if (key === 'playerName') return a.playerName.localeCompare(b.playerName, undefined, {sensitivity: 'base'}) * factor;
  if (key === 'singles') return (recordPoints(a.singlesWins, a.singlesTies) - recordPoints(b.singlesWins, b.singlesTies)) * factor || a.playerName.localeCompare(b.playerName);
  if (key === 'doubles') return (recordPoints(a.doublesWins, a.doublesTies) - recordPoints(b.doublesWins, b.doublesTies)) * factor || a.playerName.localeCompare(b.playerName);
  return (a[key] - b[key]) * factor || a.playerName.localeCompare(b.playerName);
}

function sortLabel(key: SortKey): string {
  return ({playerName: 'name', matchesPlayed: 'matches', wins: 'wins', winPercentage: 'win %', points: 'points', singles: 'singles', doubles: 'doubles'} as const)[key];
}

function recordPoints(wins: number, ties: number): number {
  return wins + ties * .5;
}

function formatRecord(wins: number, losses: number, ties: number): string {
  return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}
