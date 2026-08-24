'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import type {StatsGroup, StatsRow} from '@/app/stats/page';
import styles from '@/app/stats/Stats.module.css';

type SortKey = keyof Pick<StatsRow,
  'playerName' | 'teamName' | 'matchesPlayed' | 'wins' | 'losses' | 'ties' | 'winPercentage' | 'points'
> | 'singles' | 'doubles';
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

  const contextRows = useMemo(() => {
    if (!group) return [];
    return group.rows.filter((row) => {
      const divisionMatch = division === 'Women' ? row.gender === 'Women' : true;
      const teamMatch = team === 'all' || row.teamNames.includes(team);
      return divisionMatch && teamMatch;
    });
  }, [group, division, team]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contextRows;
    return contextRows.filter((row) =>
      row.playerName.toLowerCase().includes(query)
      || row.teamName.toLowerCase().includes(query)
      || row.teamNames.some((teamName) => teamName.toLowerCase().includes(query)));
  }, [contextRows, search]);

  const sortedRows = useMemo(() => [...filteredRows].sort((a, b) => compareRows(a, b, sortKey, direction)), [filteredRows, sortKey, direction]);
  const rows = limit === 'all' ? sortedRows : sortedRows.slice(0, limit);
  const leaders = useMemo(() => buildLeaders(contextRows), [contextRows]);
  const hasCustomView = division !== 'Open' || team !== 'all' || search.trim() !== '' || limit !== 5 || sortKey !== 'points' || direction !== 'desc';
  const textSort = sortKey === 'playerName' || sortKey === 'teamName';

  function selectGroup(nextGroupId: string) {
    setGroupId(nextGroupId);
    resetControls();
    const nextUrl = nextGroupId === 'overall' ? '/stats' : `/stats?season=${encodeURIComponent(nextGroupId)}`;
    window.history.replaceState(window.history.state, '', nextUrl);
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
    setDirection(next === 'playerName' || next === 'teamName' ? 'asc' : 'desc');
  }

  function selectSort(next: SortKey) {
    setSortKey(next);
    setDirection(next === 'playerName' || next === 'teamName' ? 'asc' : 'desc');
  }

  if (!group) return null;

  return (
    <section className={styles.statsShell}>
      <div className={styles.controls}>
        <div className={styles.seasonTabs} aria-label="Stats season">
          {groups.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={entry.id === group.id ? styles.activeSeason : undefined}
              onClick={() => selectGroup(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className={styles.secondaryControls}>
          <div className={styles.divisionTabs} aria-label="Stats division">
            <button type="button" className={division === 'Open' ? styles.activeDivision : undefined} onClick={() => {setDivision('Open'); setLimit(5);}}>Open</button>
            <button type="button" className={division === 'Women' ? styles.activeDivision : undefined} onClick={() => {setDivision('Women'); setLimit(5);}}>Women</button>
          </div>

          <label className={styles.teamControl}>
            <span className="sr-only">Filter by team</span>
            <select value={team} onChange={(event) => {setTeam(event.target.value); setLimit(5);}}>
              <option value="all">All teams</option>
              {teams.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
            </select>
          </label>

          <label className={styles.searchControl}>
            <span className="sr-only">Search players or teams</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player or team" />
          </label>

          <label className={styles.limitControl}>
            <span>Show</span>
            <select value={limit} onChange={(event) => setLimit(event.target.value === 'all' ? 'all' : Number(event.target.value) as 5 | 10 | 25)}>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>

        <div className={styles.mobileSortControl}>
          <label>
            <span>Sort by</span>
            <select value={sortKey} onChange={(event) => selectSort(event.target.value as SortKey)}>
              <option value="points">Points</option>
              <option value="wins">Wins</option>
              <option value="winPercentage">Win %</option>
              <option value="matchesPlayed">Matches</option>
              <option value="singles">Singles</option>
              <option value="doubles">Doubles</option>
              <option value="losses">Losses</option>
              <option value="ties">Ties</option>
              <option value="playerName">Player</option>
              <option value="teamName">Team</option>
            </select>
          </label>
          <button type="button" onClick={() => setDirection((value) => value === 'desc' ? 'asc' : 'desc')} aria-label="Reverse sort direction">
            {textSort ? (direction === 'asc' ? 'A → Z' : 'Z → A') : (direction === 'desc' ? 'High → Low' : 'Low → High')}
          </button>
        </div>
      </div>

      <div className={styles.recordStrip}>
        <RecordCard label="Most wins" row={leaders.wins} value={leaders.wins ? String(leaders.wins.wins) : '—'} />
        <RecordCard label="Best win %" row={leaders.winPercentage} value={leaders.winPercentage ? `${leaders.winPercentage.winPercentage.toFixed(1)}%` : '—'} note="5+ results" />
        <RecordCard label="Singles points" row={leaders.singles} value={leaders.singles ? formatPoints(recordPoints(leaders.singles.singlesWins, leaders.singles.singlesTies)) : '—'} />
        <RecordCard label="Doubles points" row={leaders.doubles} value={leaders.doubles ? formatPoints(recordPoints(leaders.doubles.singlesWins, leaders.doubles.singlesTies)) : '—'} />
      </div>

      <div className={styles.tableMeta}>
        <div>
          <strong>{group.label} · {division}{team !== 'all' ? ` · ${team}` : ''}</strong>
          <span>{filteredRows.length} players · ranked by {sortLabel(sortKey)} {direction === 'desc' ? '↓' : '↑'}</span>
        </div>
        <div className={styles.metaActions}>
          {hasCustomView ? <button type="button" className={styles.resetButton} onClick={resetControls}>Reset view</button> : null}
          <details className={styles.statsHelp}>
            <summary>How stats work</summary>
            <div>
              <p><strong>Points:</strong> 1 per win, 0.5 per tie.</p>
              <p><strong>Win %:</strong> wins plus half of ties divided by recorded results.</p>
              <p><strong>Best Win %:</strong> requires at least 5 recorded results.</p>
              <p>Table rank always reflects the active sort and filters. Search narrows the table but does not redefine the record leaders.</p>
            </div>
          </details>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.statsTable}>
          <thead>
            <tr>
              <SortableHeader label="Player" sort="playerName" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Team" sort="teamName" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Matches" sort="matchesPlayed" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Wins" sort="wins" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Losses" sort="losses" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Ties" sort="ties" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Win %" sort="winPercentage" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Singles" sort="singles" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Doubles" sort="doubles" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Points" sort="points" active={sortKey} direction={direction} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rank = sortedRows.findIndex((entry) => entry.playerId === row.playerId) + 1;
              return (
                <tr key={`${group.id}-${row.playerId}`}>
                  <td data-label="Player"><span className={styles.rank}>{rank}</span><Link className={styles.playerLink} href={`/players?search=${encodeURIComponent(row.playerName)}`}>{row.playerName}</Link></td>
                  <td data-label="Team">
                    <span className={styles.teamCell}>
                      <span>{row.teamName}</span>
                      {row.teamNames.length > 1 ? <small>{row.teamNames.join(' · ')}</small> : null}
                    </span>
                  </td>
                  <td data-label="Matches">{row.matchesPlayed}</td>
                  <td data-label="Wins">{row.wins}</td>
                  <td data-label="Losses">{row.losses}</td>
                  <td data-label="Ties">{row.ties}</td>
                  <td data-label="Win %">{row.winPercentage.toFixed(1)}%{row.matchesPlayed < 5 ? <span className={styles.smallSample} title="Small sample: fewer than 5 recorded results">*</span> : null}</td>
                  <td data-label="Singles">{formatRecord(row.singlesWins, row.singlesLosses, row.singlesTies)}</td>
                  <td data-label="Doubles">{formatRecord(row.doublesWins, row.doublesLosses, row.doublesTies)}</td>
                  <td data-label="Points"><strong>{formatPoints(row.points)}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? <p className={styles.emptyState}>No players match these filters.</p> : null}
      </div>
      <p className={styles.qualifierNote}>* Win percentage with fewer than 5 recorded results is shown as a small sample and is excluded from the “Best win %” leader card.</p>
    </section>
  );
}

function RecordCard({label, row, value, note}: {label: string; row?: StatsRow; value: string; note?: string}) {
  return <article><span>{label}</span><strong>{value}</strong>{row ? <Link href={`/players?search=${encodeURIComponent(row.playerName)}`}>{row.playerName}</Link> : <small>No data</small>}{note ? <small>{note}</small> : null}</article>;
}

function buildLeaders(rows: StatsRow[]) {
  const byWins = [...rows].sort((a, b) => b.wins - a.wins || b.points - a.points || a.playerName.localeCompare(b.playerName))[0];
  const qualified = rows.filter((row) => row.matchesPlayed >= 5);
  const byWinPercentage = [...qualified].sort((a, b) => b.winPercentage - a.winPercentage || b.matchesPlayed - a.matchesPlayed || a.playerName.localeCompare(b.playerName))[0];
  const bySingles = [...rows].sort((a, b) => recordPoints(b.singlesWins, b.singlesTies) - recordPoints(a.singlesWins, a.singlesTies) || a.playerName.localeCompare(b.playerName))[0];
  const byDoubles = [...rows].sort((a, b) => recordPoints(b.doublesWins, b.doublesTies) - recordPoints(a.doublesWins, a.doublesTies) || a.playerName.localeCompare(b.playerName))[0];
  return {wins: byWins, winPercentage: byWinPercentage, singles: bySingles, doubles: byDoubles};
}

function SortableHeader({label, sort, active, direction, onSort}: {
  label: string;
  sort: SortKey;
  active: SortKey;
  direction: Direction;
  onSort: (sort: SortKey) => void;
}) {
  const ariaSort = active === sort ? (direction === 'desc' ? 'descending' : 'ascending') : 'none';
  return (
    <th aria-sort={ariaSort}>
      <button type="button" onClick={() => onSort(sort)} aria-label={`Sort by ${label}`}>
        {label}
        <span aria-hidden="true">{active === sort ? (direction === 'desc' ? ' ↓' : ' ↑') : ' ↕'}</span>
      </button>
    </th>
  );
}

function compareRows(a: StatsRow, b: StatsRow, key: SortKey, direction: Direction): number {
  const factor = direction === 'asc' ? 1 : -1;
  if (key === 'playerName' || key === 'teamName') return a[key].localeCompare(b[key], undefined, {sensitivity: 'base'}) * factor;
  if (key === 'singles') return (recordPoints(a.singlesWins, a.singlesTies) - recordPoints(b.singlesWins, b.singlesTies)) * factor || a.playerName.localeCompare(b.playerName);
  if (key === 'doubles') return (recordPoints(a.doublesWins, a.doublesTies) - recordPoints(b.doublesWins, b.doublesTies)) * factor || a.playerName.localeCompare(b.playerName);
  return (a[key] - b[key]) * factor || a.playerName.localeCompare(b.playerName);
}

function sortLabel(key: SortKey): string {
  if (key === 'singles') return 'singles points';
  if (key === 'doubles') return 'doubles points';
  return ({playerName: 'player', teamName: 'team', matchesPlayed: 'matches', wins: 'wins', losses: 'losses', ties: 'ties', winPercentage: 'win %', points: 'points'} as const)[key];
}

function recordPoints(wins: number, ties: number): number {return wins + ties * .5;}
function formatRecord(wins: number, losses: number, ties: number): string {return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;}
function formatPoints(points: number): string {return Number.isInteger(points) ? points.toFixed(0) : points.toFixed(1);}
