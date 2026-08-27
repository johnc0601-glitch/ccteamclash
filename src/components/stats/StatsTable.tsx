'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import type {StatsGroup, StatsRow} from '@/app/stats/page';
import styles from '@/app/stats/Stats.module.css';

type SortKey = 'matchesPlayed' | 'wins' | 'winPercentage' | 'points' | 'singles' | 'doubles' | 'currentCi' | 'ciGain' | 'singlesCiGain' | 'doublesCiGain';
type Direction = 'asc' | 'desc';
type Limit = 25 | 'all';
type Division = 'Open' | 'Women';

const HEADER_HELP: Record<SortKey, string> = {
  matchesPlayed: 'Matches — Total recorded matches played.',
  wins: 'Wins — Total recorded match wins.',
  winPercentage: 'Win % — Percentage of completed matches won.',
  singles: 'Singles — Player wins, losses and ties in singles matches.',
  doubles: 'Doubles — Player wins, losses and ties in doubles matches.',
  points: 'Points — Total match points earned for the player’s team.',
  currentCi: 'CI — Current Clash Index rating.',
  ciGain: 'CI +/- — Clash Index movement earned from recorded match results.',
  singlesCiGain: 'S +/- — Clash Index movement earned from singles results.',
  doublesCiGain: 'D +/- — Clash Index movement earned from doubles results.',
};

export function StatsTable({groups, initialGroupId = 'overall'}: {groups: StatsGroup[]; initialGroupId?: string}) {
  const validInitialGroupId = groups.some((group) => group.id === initialGroupId) ? initialGroupId : groups[0]?.id ?? 'overall';
  const [groupId, setGroupId] = useState(validInitialGroupId);
  const [sortKey, setSortKey] = useState<SortKey>('points');
  const [direction, setDirection] = useState<Direction>('desc');
  const [limit, setLimit] = useState<Limit>(25);
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
  const hasCustomView = division !== 'Open' || team !== 'all' || search.trim() !== '' || limit !== 25 || sortKey !== 'points' || direction !== 'desc';

  function selectGroup(nextGroupId: string) {
    setGroupId(nextGroupId);
    resetControls();
    window.history.replaceState(window.history.state, '', nextGroupId === 'overall' ? '/stats' : `/stats?season=${encodeURIComponent(nextGroupId)}`);
  }

  function resetControls() {
    setDivision('Open');
    setTeam('all');
    setSearch('');
    setLimit(25);
    setSortKey('points');
    setDirection('desc');
  }

  function toggleSort(next: SortKey) {
    if (sortKey === next) {
      setDirection((value) => value === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSortKey(next);
    setDirection('desc');
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
            <button type="button" className={division === 'Open' ? styles.activeDivision : undefined} onClick={() => {setDivision('Open'); setLimit(25);}}>Open</button>
            <button type="button" className={division === 'Women' ? styles.activeDivision : undefined} onClick={() => {setDivision('Women'); setLimit(25);}}>Women</button>
          </div>

          <select aria-label="Filter by team" value={team} onChange={(event) => {setTeam(event.target.value); setLimit(25);}}>
            <option value="all">All teams</option>
            {teams.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
          </select>

          <input aria-label="Search players" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player" />
        </div>

        <div className={styles.mobileSortControl}>
          <select aria-label="Sort stats" value={sortKey} onChange={(event) => {setSortKey(event.target.value as SortKey); setDirection('desc');}}>
            <option value="points">Points</option>
            <option value="currentCi">CI</option>
            <option value="ciGain">CI +/-</option>
            <option value="singlesCiGain">Singles CI +/-</option>
            <option value="doublesCiGain">Doubles CI +/-</option>
            <option value="wins">Wins</option>
            <option value="winPercentage">Win %</option>
            <option value="matchesPlayed">Matches</option>
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
          </select>
          <button type="button" onClick={() => setDirection((value) => value === 'desc' ? 'asc' : 'desc')}>
            {direction === 'desc' ? 'High → Low' : 'Low → High'}
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
            <select value={limit} onChange={(event) => setLimit(event.target.value === 'all' ? 'all' : 25)}>
              <option value={25}>Top 25</option>
              <option value="all">All</option>
            </select>
          </label>
          {hasCustomView ? <button type="button" className={styles.resetButton} onClick={resetControls}>Reset view</button> : null}
        </div>
      </div>

      <div className={`${styles.tableWrap} ${styles.desktopTableWrap}`}>
        <table className={styles.statsTable}>
          <thead>
            <tr>
              <th aria-label="Player" />
              <SortableHeader label="M" sort="matchesPlayed" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="W" sort="wins" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Win %" sort="winPercentage" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Singles" sort="singles" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Doubles" sort="doubles" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Pts" sort="points" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="CI" sort="currentCi" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="CI +/-" sort="ciGain" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="S +/-" sort="singlesCiGain" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="D +/-" sort="doublesCiGain" active={sortKey} direction={direction} onSort={toggleSort} />
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
                  <td><strong>{formatCi(row.currentCi)}</strong></td>
                  <td><strong>{formatCiGain(row.ciGain)}</strong></td>
                  <td>{formatCiGain(row.singlesCiGain)}</td>
                  <td>{formatCiGain(row.doublesCiGain)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? <p className={styles.emptyState}>No players match these filters.</p> : null}
      </div>

      <div className={`${styles.tableWrap} ${styles.mobileTableWrap}`}>
        <table className={styles.mobileStatsTable}>
          <thead>
            <tr>
              <th>Player</th>
              <th>{mobileSortLabel(sortKey)} {direction === 'desc' ? '↓' : '↑'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rank = sortedRows.findIndex((entry) => entry.playerId === row.playerId) + 1;
              return (
                <tr key={`mobile-${group.id}-${row.playerId}`}>
                  <td><span className={styles.rank}>{rank}</span><Link className={styles.playerLink} href={`/players?search=${encodeURIComponent(row.playerName)}`}>{row.playerName}</Link></td>
                  <td><strong>{formatMobileValue(row, sortKey)}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? <p className={styles.emptyState}>No players match these filters.</p> : null}
      </div>

      <p className={styles.qualifierNote}>* Fewer than 5 recorded results. CI +/-, S +/- and D +/- count earned match movement only; season reseeds are excluded.</p>
    </section>
  );
}

function SortableHeader({label, sort, active, direction, onSort}: {label: string; sort: SortKey; active: SortKey; direction: Direction; onSort: (sort: SortKey) => void}) {
  return (
    <th aria-sort={active === sort ? (direction === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <span className={styles.headerCell}>
        <button type="button" onClick={() => onSort(sort)}>{label}<span aria-hidden="true">{active === sort ? (direction === 'desc' ? ' ↓' : ' ↑') : ''}</span></button>
        <details className={styles.headerInfo}>
          <summary aria-label={`About ${label}`}>i</summary>
          <div>{HEADER_HELP[sort]}</div>
        </details>
      </span>
    </th>
  );
}

function compareRows(a: StatsRow, b: StatsRow, key: SortKey, direction: Direction): number {
  const factor = direction === 'asc' ? 1 : -1;
  if (key === 'singles') return (recordPoints(a.singlesWins, a.singlesTies) - recordPoints(b.singlesWins, b.singlesTies)) * factor || a.playerName.localeCompare(b.playerName);
  if (key === 'doubles') return (recordPoints(a.doublesWins, a.doublesTies) - recordPoints(b.doublesWins, b.doublesTies)) * factor || a.playerName.localeCompare(b.playerName);
  if (key === 'currentCi' || key === 'ciGain' || key === 'singlesCiGain' || key === 'doublesCiGain') {
    const aValue = a[key];
    const bValue = b[key];
    if (aValue === undefined && bValue === undefined) return a.playerName.localeCompare(b.playerName);
    if (aValue === undefined) return 1;
    if (bValue === undefined) return -1;
    return (aValue - bValue) * factor || a.playerName.localeCompare(b.playerName);
  }
  return (a[key] - b[key]) * factor || a.playerName.localeCompare(b.playerName);
}

function sortLabel(key: SortKey): string {
  return ({
    matchesPlayed: 'matches', wins: 'wins', winPercentage: 'win %', points: 'points',
    singles: 'singles', doubles: 'doubles', currentCi: 'CI', ciGain: 'CI +/-',
    singlesCiGain: 'Singles CI +/-', doublesCiGain: 'Doubles CI +/-',
  } as const)[key];
}

function mobileSortLabel(key: SortKey): string {
  return ({
    matchesPlayed: 'M', wins: 'W', winPercentage: 'Win %', points: 'Pts',
    singles: 'Singles', doubles: 'Doubles', currentCi: 'CI', ciGain: 'CI +/-',
    singlesCiGain: 'S +/-', doublesCiGain: 'D +/-',
  } as const)[key];
}

function formatMobileValue(row: StatsRow, key: SortKey): string {
  if (key === 'matchesPlayed') return String(row.matchesPlayed);
  if (key === 'wins') return String(row.wins);
  if (key === 'winPercentage') return `${row.winPercentage.toFixed(1)}%${row.matchesPlayed < 5 ? '*' : ''}`;
  if (key === 'points') return formatPoints(row.points);
  if (key === 'singles') return formatRecord(row.singlesWins, row.singlesLosses, row.singlesTies);
  if (key === 'doubles') return formatRecord(row.doublesWins, row.doublesLosses, row.doublesTies);
  if (key === 'currentCi') return formatCi(row.currentCi);
  if (key === 'ciGain') return formatCiGain(row.ciGain);
  if (key === 'singlesCiGain') return formatCiGain(row.singlesCiGain);
  return formatCiGain(row.doublesCiGain);
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

function formatCi(value: number | undefined): string {
  if (value === undefined) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatCiGain(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
}
